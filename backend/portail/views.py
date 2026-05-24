from django.conf import settings
from django.core.mail import BadHeaderError, send_mail
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from .models import User, Filiere, Groupe, Etudiant, Module, Note, Absence, Alerte, EmploiDuTemps
from .serializers import UserSerializer, FiliereSerializer, GroupeSerializer, EtudiantSerializer, ModuleSerializer, NoteSerializer, AbsenceSerializer, AlerteSerializer, EmploiDuTempsSerializer

class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        role = (getattr(user, 'role', '') or '').strip().lower()
        return bool(user and user.is_authenticated and (role == 'admin' or user.is_staff or user.is_superuser))

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

class FiliereViewSet(viewsets.ModelViewSet):
    queryset = Filiere.objects.all()
    serializer_class = FiliereSerializer

class GroupeViewSet(viewsets.ModelViewSet):
    queryset = Groupe.objects.select_related('filiere').all().order_by('annee', 'filiere__code', 'code')
    serializer_class = GroupeSerializer

class EtudiantViewSet(viewsets.ModelViewSet):
    queryset = Etudiant.objects.select_related('user', 'filiere', 'groupe').all().order_by('user__last_name', 'user__first_name', 'matricule')
    serializer_class = EtudiantSerializer

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer

class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer

class AbsenceViewSet(viewsets.ModelViewSet):
    queryset = Absence.objects.all()
    serializer_class = AbsenceSerializer

class EmploiDuTempsViewSet(viewsets.ModelViewSet):
    serializer_class = EmploiDuTempsSerializer

    def get_queryset(self):
        queryset = EmploiDuTemps.objects.select_related('filiere', 'groupe', 'module').all()
        annee = self.request.query_params.get('annee')
        niveau = self.request.query_params.get('niveau')
        filiere = self.request.query_params.get('filiere')
        groupe = self.request.query_params.get('groupe')

        if annee:
            queryset = queryset.filter(annee=annee)
        if niveau:
            queryset = queryset.filter(niveau=niveau)
        if filiere:
            queryset = queryset.filter(filiere=filiere)
        if groupe:
            queryset = queryset.filter(groupe=groupe)

        return queryset

def resolve_user_role(user):
    role = (getattr(user, 'role', '') or '').strip().lower()
    role_aliases = {
        'admin': 'admin',
        'administrateur': 'admin',
        'enseignant': 'enseignant',
        'professeur': 'enseignant',
        'prof': 'enseignant',
        'teacher': 'enseignant',
        'etudiant': 'etudiant',
        'étudiant': 'etudiant',
        'student': 'etudiant',
    }

    if role in role_aliases:
        return role_aliases[role]

    if user.is_superuser or user.is_staff:
        return 'admin'

    if Etudiant.objects.filter(user=user).exists():
        return 'etudiant'

    username = (user.username or '').lower()
    if username.startswith(('prof', 'enseignant')):
        return 'enseignant'
    if username.startswith(('etud', 'etudiant')):
        return 'etudiant'

    return 'etudiant'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parcours_academique(request):
    filieres = Filiere.objects.all().order_by('cycle', 'code', 'nom')
    etudiants = Etudiant.objects.select_related('user', 'filiere', 'groupe').all()
    groupes = Groupe.objects.select_related('filiere').all()

    parcours = [
        {
            'annee': 1,
            'niveau': '1A',
            'cycle': 'preparatoire',
            'titre': '1ere annee - cycle preparatoire integre',
        },
        {
            'annee': 2,
            'niveau': '2A',
            'cycle': 'preparatoire',
            'titre': '2eme annee - cycle preparatoire integre',
        },
        {
            'annee': 3,
            'niveau': '3A',
            'cycle': 'ingenieur',
            'titre': '3eme annee - choix de filiere',
        },
        {
            'annee': 4,
            'niveau': '4A',
            'cycle': 'master',
            'titre': '4eme annee - specialite master',
        },
        {
            'annee': 5,
            'niveau': '5A',
            'cycle': 'master',
            'titre': '5eme annee - specialite master',
        },
    ]

    data = []
    for item in parcours:
        filieres_cycle = filieres.filter(cycle=item['cycle'])
        data.append({
            **item,
            'nombre_etudiants': etudiants.filter(annee=item['annee']).count(),
            'nombre_groupes': groupes.filter(annee=item['annee']).count(),
            'filieres': [
                {
                    'id': filiere.id,
                    'nom': filiere.nom,
                    'code': filiere.code,
                    'description': filiere.description,
                    'nombre_etudiants': etudiants.filter(annee=item['annee'], filiere=filiere).count(),
                    'groupes': [
                        {
                            'id': groupe.id,
                            'nom': groupe.nom,
                            'code': groupe.code,
                            'nombre_etudiants': etudiants.filter(groupe=groupe).count(),
                        }
                        for groupe in groupes.filter(annee=item['annee'], filiere=filiere)
                    ],
                }
                for filiere in filieres_cycle
            ],
        })

    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role(request):
    return Response({'role': resolve_user_role(request.user)})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def envoyer_alertes(request):
    notes = Note.objects.all()
    absences = Absence.objects.all()
    etudiants = Etudiant.objects.select_related('user').all()

    alertes_envoyees = 0
    alertes_echouees = 0
    alertes_sans_email = 0
    details_echecs = []

    for etudiant in etudiants:
        notes_etudiant = notes.filter(etudiant=etudiant)
        absences_etudiant = absences.filter(etudiant=etudiant)
        absences_non_justifiees = absences_etudiant.filter(justifiee=False).count()

        moyenne = None
        if notes_etudiant.exists():
            moyenne = sum([n.valeur for n in notes_etudiant]) / notes_etudiant.count()

        nb_absences = absences_etudiant.count()
        risque_academique = moyenne is not None and moyenne < 10
        risque_assiduite = absences_non_justifiees >= 2 or nb_absences > 3

        if risque_academique or risque_assiduite:
            email = etudiant.user.email
            if not email:
                alertes_sans_email += 1
                continue

            sujet = "Alerte - Portail Absences"
            moyenne_label = 'N/A' if moyenne is None else f'{round(moyenne, 2)}/20'
            alerte_message = (
                f'Votre profil est detecte comme a risque. '
                f'Moyenne: {moyenne_label}. '
                f'Absences: {nb_absences}. '
                f'Absences non justifiees: {absences_non_justifiees}. '
                f'Veuillez contacter votre administration.'
            )
            Alerte.objects.create(
                etudiant=etudiant,
                titre='Alerte risque academique',
                message=alerte_message,
                moyenne=moyenne,
                nb_absences=nb_absences,
                absences_non_justifiees=absences_non_justifiees,
            )

            message = f"""
Bonjour {etudiant.user.first_name or etudiant.user.username},

Vous etes detecte comme etudiant a risque :
- Moyenne : {moyenne_label}
- Nombre d'absences : {nb_absences}
- Absences non justifiees : {absences_non_justifiees}

Veuillez contacter votre administration.

Cordialement,
Portail Absences
            """

            try:
                send_mail(
                    sujet,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                alertes_envoyees += 1
            except (BadHeaderError, Exception) as exc:
                alertes_echouees += 1
                if len(details_echecs) < 5:
                    details_echecs.append({
                        'etudiant': etudiant.user.get_full_name() or etudiant.user.username,
                        'email': email,
                        'erreur': str(exc),
                    })

    message = (
        f'{alertes_envoyees} alerte(s) envoyee(s), '
        f'{alertes_echouees} echec(s), '
        f'{alertes_sans_email} profil(s) sans email.'
    )

    return Response({
        'message': message,
        'envoyees': alertes_envoyees,
        'echouees': alertes_echouees,
        'sans_email': alertes_sans_email,
        'details_echecs': details_echecs,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_alertes(request):
    etudiant = Etudiant.objects.filter(user=request.user).first()
    if not etudiant:
        return Response([])

    alertes = Alerte.objects.filter(etudiant=etudiant)
    return Response(AlerteSerializer(alertes, many=True).data)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profil(request):
    user = request.user
    if request.method == 'GET':
        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'role': resolve_user_role(user),
        })
    elif request.method == 'PUT':
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)
        user.save()
        return Response({'message': 'Profil mis à jour !'})
