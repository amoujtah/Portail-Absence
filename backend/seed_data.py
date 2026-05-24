import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random
from portail.models import *

User = get_user_model()

def create_users():
    print("Création des utilisateurs...")
    
    # Supprimer les anciens utilisateurs s'ils existent
    User.objects.filter(username__in=['admin', 'professeur', 'etudiant1', 'etudiant2', 'etudiant3']).delete()
    
    # Compte 1: Admin
    admin = User.objects.create_user(
        username='admin',
        email='admin@portail.com',
        password='admin123',
        first_name='Admin',
        last_name='Système',
        role='admin',
        is_staff=True,
        is_superuser=True
    )
    print("✓ Admin créé (admin/admin123)")
    
    # Compte 2: Professeur
    prof = User.objects.create_user(
        username='professeur',
        email='prof@portail.com',
        password='prof123',
        first_name='Jean',
        last_name='Martin',
        role='enseignant'
    )
    print("✓ Professeur créé (professeur/prof123)")
    
    # Comptes 3-5: Étudiants
    etudiants_users = []
    for i in range(1, 4):
        user = User.objects.create_user(
            username=f'etudiant{i}',
            email=f'etudiant{i}@portail.com',
            password='etudiant123',
            first_name=f'Marie{i}',
            last_name=f'Dubois{i}',
            role='etudiant'
        )
        etudiants_users.append(user)
        print(f"✓ Utilisateur étudiant{i} créé (etudiant{i}/etudiant123)")
    
    return admin, prof, etudiants_users

def create_filieres():
    print("\nCréation des filières...")
    filieres_data = [
        {'code': 'INFO', 'nom': 'Informatique', 'cycle': 'Licence', 'description': 'Filière Informatique'},
        {'code': 'MATH', 'nom': 'Mathématiques', 'cycle': 'Master', 'description': 'Filière Mathématiques'},
        {'code': 'GEST', 'nom': 'Gestion', 'cycle': 'Licence', 'description': 'Filière Gestion'},
    ]
    
    created = []
    for f in filieres_data:
        filiere, _ = Filiere.objects.get_or_create(
            code=f['code'],
            defaults={
                'nom': f['nom'],
                'cycle': f['cycle'],
                'description': f['description']
            }
        )
        created.append(filiere)
        print(f"✓ Filière {f['code']} - {f['nom']} ({f['cycle']}) créée")
    
    return created

def create_groupes():
    print("\nCréation des groupes...")
    filieres = Filiere.objects.all()
    
    groupes_data = ['G1', 'G2']
    groupes = []
    
    for filiere in filieres:
        for nom in groupes_data:
            code_groupe = f"{filiere.code}_{nom}"
            groupe, created = Groupe.objects.get_or_create(
                code=code_groupe,
                defaults={
                    'nom': nom,
                    'filiere': filiere,
                    'annee': datetime.now().year,
                    'niveau': random.choice(['L1', 'L2', 'L3']),
                    'cycle': filiere.cycle
                }
            )
            groupes.append(groupe)
            print(f"✓ Groupe {code_groupe} créé")
    
    return groupes

def create_etudiants(etudiants_users):
    print("\nCréation des étudiants...")
    filieres = Filiere.objects.all()
    groupes = Groupe.objects.all()
    
    if not filieres or not groupes:
        print("❌ Aucune filière ou groupe trouvé")
        return []
    
    etudiants_data = [
        {'matricule': 'MAT001', 'cin': 'CIN001', 'telephone': '0612345678', 'adresse': '12 Rue de Paris', 'ville': 'Paris', 'date_naissance': '2000-01-01'},
        {'matricule': 'MAT002', 'cin': 'CIN002', 'telephone': '0623456789', 'adresse': '15 Rue de Lyon', 'ville': 'Lyon', 'date_naissance': '2000-02-02'},
        {'matricule': 'MAT003', 'cin': 'CIN003', 'telephone': '0634567890', 'adresse': '18 Rue de Marseille', 'ville': 'Marseille', 'date_naissance': '2000-03-03'},
    ]
    
    etudiants = []
    for i, user in enumerate(etudiants_users):
        data = etudiants_data[i]
        etudiant = Etudiant.objects.create(
            user=user,
            matricule=data['matricule'],
            cin=data['cin'],
            telephone=data['telephone'],
            adresse=data['adresse'],
            ville=data['ville'],
            date_naissance=data['date_naissance'],
            filiere=random.choice(filieres),
            groupe=random.choice(groupes),
            niveau=random.choice(['L1', 'L2', 'L3']),
            annee=datetime.now().year,
            cycle=random.choice(['Licence', 'Master'])
        )
        etudiants.append(etudiant)
        print(f"✓ Étudiant {etudiant.matricule} créé")
    
    return etudiants

def seed_all():
    print("=" * 50)
    print("DÉBUT DU PEUPLEMENT DE LA BASE")
    print("=" * 50)
    
    admin, prof, etudiants_users = create_users()
    create_filieres()
    create_groupes()
    create_etudiants(etudiants_users)
    
    print("\n" + "=" * 50)
    print("PEUPLEMENT TERMINÉ !")
    print("=" * 50)
    
    print("\n📋 COMPTES DE TEST :")
    print("-" * 30)
    print("🔑 ADMIN :")
    print("   Username: admin")
    print("   Password: admin123")
    print("\n👨‍🏫 PROFESSEUR :")
    print("   Username: professeur")
    print("   Password: prof123")
    print("\n👨‍🎓 ÉTUDIANTS :")
    print("   Username: etudiant1, etudiant2, etudiant3")
    print("   Password: etudiant123")
    print("=" * 50)

if __name__ == "__main__":
    seed_all()
