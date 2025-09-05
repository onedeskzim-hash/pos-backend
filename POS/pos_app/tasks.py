from datetime import datetime, timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from .models import ReportSchedule
from .services import EmailService


def check_and_send_scheduled_reports():
    """Check for due reports and send them"""
    now = timezone.now()
    
    # Get all active schedules that are due
    due_schedules = ReportSchedule.objects.filter(
        is_active=True,
        next_run__lte=now
    )
    
    for schedule in due_schedules:
        try:
            # Send the report
            success = EmailService.send_scheduled_report(schedule.id)
            
            if success:
                # Calculate next run time
                if schedule.frequency == 'daily':
                    schedule.next_run = schedule.next_run + timedelta(days=1)
                elif schedule.frequency == 'weekly':
                    schedule.next_run = schedule.next_run + timedelta(weeks=1)
                elif schedule.frequency == 'monthly':
                    # Handle month rollover
                    next_month = schedule.next_run.month + 1
                    next_year = schedule.next_run.year
                    if next_month > 12:
                        next_month = 1
                        next_year += 1
                    schedule.next_run = schedule.next_run.replace(year=next_year, month=next_month)
                
                schedule.save()
                print(f"✅ Sent {schedule.frequency} {schedule.format} report to {schedule.email}")
            else:
                print(f"❌ Failed to send report to {schedule.email}")
                
        except Exception as e:
            print(f"❌ Error processing schedule {schedule.id}: {e}")


class Command(BaseCommand):
    help = 'Check and send scheduled reports'
    
    def handle(self, *args, **options):
        self.stdout.write('Checking for scheduled reports...')
        check_and_send_scheduled_reports()
        self.stdout.write(self.style.SUCCESS('Scheduled reports check completed'))