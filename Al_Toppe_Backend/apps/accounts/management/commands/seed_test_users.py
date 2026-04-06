"""
Crée des utilisateurs de test (entrepreneur, coach, bailleur, admin).
Mot de passe par défaut : Testaltoppe2026!

Usage:
  python manage.py seed_test_users
  python manage.py seed_test_users --password MonMotDePasse
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.accounts.utils import normalize_senegal_phone
from apps.entrepreneurs.models import Entrepreneur
from apps.coaches.models import Coach
from apps.bailleurs.models import Bailleur


TEST_USERS = (
    {
        "key": "entrepreneur",
        "phone_digits": "221701001001",  # -> 221 70 100 10 01
        "role": "entrepreneur",
        "email": "test.entrepreneur@altoppe.local",
        "entrepreneur": {
            "first_name": "Aminata",
            "last_name": "Test",
            "civility": "Mme",
            "cni_number": "1990000000001",
            "address": "Dakar, Sénégal — compte test",
        },
    },
    {
        "key": "coach",
        "phone_digits": "221701001002",
        "role": "coach",
        "email": "test.coach@altoppe.local",
        "coach": {"organization": "Structure accompagnement test"},
    },
    {
        "key": "bailleur",
        "phone_digits": "221701001003",
        "role": "bailleur",
        "email": "test.bailleur@altoppe.local",
        "bailleur": {
            "organization_name": "Fonds test AL-TOPPE",
            "organization_type": "ong",
        },
    },
    {
        "key": "admin",
        "phone_digits": "221701001004",
        "role": "admin",
        "email": "test.admin@altoppe.local",
        "is_staff": True,
        "is_superuser": True,
    },
)


class Command(BaseCommand):
    help = "Crée ou met à jour des comptes de test pour l’auth et les rôles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="Testaltoppe2026!",
            help="Mot de passe pour tous les comptes test",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        pwd = options["password"]
        created = 0
        updated = 0

        for spec in TEST_USERS:
            phone = normalize_senegal_phone(spec["phone_digits"])
            user, was_created = User.objects.get_or_create(
                phone=phone,
                defaults={
                    "email": spec.get("email"),
                    "role": spec["role"],
                    "language": "fr",
                    "is_staff": spec.get("is_staff", False),
                    "is_superuser": spec.get("is_superuser", False),
                },
            )
            if not was_created:
                user.email = spec.get("email") or user.email
                user.role = spec["role"]
                user.is_staff = spec.get("is_staff", False)
                user.is_superuser = spec.get("is_superuser", False)
                updated += 1
            else:
                created += 1
            user.set_password(pwd)
            user.is_active = True
            user.save()

            if "entrepreneur" in spec:
                e = spec["entrepreneur"]
                Entrepreneur.objects.update_or_create(
                    user=user,
                    defaults={
                        "first_name": e["first_name"],
                        "last_name": e["last_name"],
                        "civility": e["civility"],
                        "cni_number": e["cni_number"],
                        "address": e["address"],
                    },
                )
            if "coach" in spec:
                c = spec["coach"]
                Coach.objects.update_or_create(
                    user=user,
                    defaults={
                        "organization": c.get("organization", ""),
                        "skills": [],
                        "certifications": [],
                    },
                )
            if "bailleur" in spec:
                b = spec["bailleur"]
                Bailleur.objects.update_or_create(
                    user=user,
                    defaults={
                        "organization_name": b["organization_name"],
                        "organization_type": b["organization_type"],
                    },
                )

        self.stdout.write(self.style.SUCCESS("Comptes test prêts."))
        self.stdout.write(f"  Créés: {created}, mis à jour: {updated}")
        self.stdout.write("")
        self.stdout.write("Connectez-vous avec le mot de passe : " + pwd)
        self.stdout.write("")
        self.stdout.write("Téléphone (avec ou sans espaces dans le formulaire) :")
        for spec in TEST_USERS:
            ph = normalize_senegal_phone(spec["phone_digits"])
            self.stdout.write(f"  [{spec['key']:^12}]  {ph}   rôle: {spec['role']}")
