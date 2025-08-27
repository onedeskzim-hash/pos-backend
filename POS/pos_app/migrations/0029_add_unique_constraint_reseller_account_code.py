from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pos_app', '0028_populate_reseller_account_codes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reseller',
            name='account_code',
            field=models.CharField(blank=True, default='', max_length=50, null=True, unique=True),
        ),
    ]