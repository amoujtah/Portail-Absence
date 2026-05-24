from rest_framework import serializers
from .models import User, Filiere, Groupe, Etudiant, Module, Note, Absence, Alerte, EmploiDuTemps

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class FiliereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filiere
        fields = '__all__'

class GroupeSerializer(serializers.ModelSerializer):
    filiere_nom = serializers.CharField(source='filiere.nom', read_only=True)
    filiere_code = serializers.CharField(source='filiere.code', read_only=True)
    nombre_etudiants = serializers.IntegerField(source='etudiant_set.count', read_only=True)

    class Meta:
        model = Groupe
        fields = '__all__'

class EtudiantSerializer(serializers.ModelSerializer):
    user_nom = serializers.SerializerMethodField()
    prenom = serializers.CharField(source='user.first_name', read_only=True)
    nom = serializers.CharField(source='user.last_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    filiere_nom = serializers.CharField(source='filiere.nom', read_only=True)
    filiere_code = serializers.CharField(source='filiere.code', read_only=True)
    groupe_nom = serializers.CharField(source='groupe.nom', read_only=True)
    groupe_code = serializers.CharField(source='groupe.code', read_only=True)

    def get_user_nom(self, obj):
        nom = obj.user.get_full_name().strip()
        return nom or obj.user.username

    class Meta:
        model = Etudiant
        fields = [
            'id',
            'user',
            'user_nom',
            'prenom',
            'nom',
            'username',
            'email',
            'filiere',
            'filiere_nom',
            'filiere_code',
            'groupe',
            'groupe_nom',
            'groupe_code',
            'niveau',
            'annee',
            'cycle',
            'matricule',
            'telephone',
            'adresse',
            'ville',
            'cin',
            'date_naissance',
        ]

class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = '__all__'

class NoteSerializer(serializers.ModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.user.get_full_name', read_only=True)
    etudiant_matricule = serializers.CharField(source='etudiant.matricule', read_only=True)
    module_nom = serializers.CharField(source='module.nom', read_only=True)

    class Meta:
        model = Note
        fields = '__all__'

class AbsenceSerializer(serializers.ModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.user.get_full_name', read_only=True)
    etudiant_matricule = serializers.CharField(source='etudiant.matricule', read_only=True)
    module_nom = serializers.CharField(source='module.nom', read_only=True)

    class Meta:
        model = Absence
        fields = '__all__'

class AlerteSerializer(serializers.ModelSerializer):
    etudiant_nom = serializers.CharField(source='etudiant.user.get_full_name', read_only=True)
    etudiant_matricule = serializers.CharField(source='etudiant.matricule', read_only=True)

    class Meta:
        model = Alerte
        fields = '__all__'

class EmploiDuTempsSerializer(serializers.ModelSerializer):
    module_nom = serializers.CharField(source='module.nom', read_only=True)
    filiere_nom = serializers.CharField(source='filiere.nom', read_only=True)
    filiere_code = serializers.CharField(source='filiere.code', read_only=True)
    groupe_nom = serializers.CharField(source='groupe.nom', read_only=True)
    groupe_code = serializers.CharField(source='groupe.code', read_only=True)

    class Meta:
        model = EmploiDuTemps
        fields = [
            'id',
            'filiere',
            'filiere_nom',
            'filiere_code',
            'groupe',
            'groupe_nom',
            'groupe_code',
            'module',
            'module_nom',
            'annee',
            'niveau',
            'jour',
            'heure_debut',
            'heure_fin',
            'salle',
            'enseignant',
            'type_seance',
        ]
