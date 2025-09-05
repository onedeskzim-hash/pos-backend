from django.core.management.base import BaseCommand
from pos_app.tasks import check_and_send_scheduled_reports


class Command(BaseCommand):
    help = 'Check and send scheduled reports'
    
    def handle(self, *args, **options):
        self.stdout.write('🔄 Checking for scheduled reports...')
        check_and_send_scheduled_reports()
        self.stdout.write(self.style.SUCCESS('✅ Scheduled reports check completed'))