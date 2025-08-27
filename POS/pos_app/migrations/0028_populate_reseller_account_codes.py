from django.db import migrations, models
from datetime import datetime


def populate_reseller_account_codes(apps, schema_editor):
    Reseller = apps.get_model('pos_app', 'Reseller')
    year = datetime.now().year
    
    resellers_without_codes = Reseller.objects.filter(
        models.Q(account_code__isnull=True) | models.Q(account_code='')
    )
    
    for index, reseller in enumerate(resellers_without_codes, 1):
        reseller.account_code = f"RESL-{year}-{index:04d}"
        reseller.save()


def reverse_populate_reseller_account_codes(apps, schema_editor):
    Reseller = apps.get_model('pos_app', 'Reseller')
    Reseller.objects.update(account_code=None)


class Migration(migrations.Migration):

    dependencies = [
        ('pos_app', '0027_reseller_account_code'),
    ]

    operations = [
        migrations.RunPython(
            populate_reseller_account_codes,
            reverse_populate_reseller_account_codes,
        ),
    ]