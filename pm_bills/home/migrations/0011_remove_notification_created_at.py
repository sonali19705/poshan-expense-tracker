# Generated by Django 5.2 on 2025-04-06 15:25

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0010_notification_is_read'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='notification',
            name='created_at',
        ),
    ]
