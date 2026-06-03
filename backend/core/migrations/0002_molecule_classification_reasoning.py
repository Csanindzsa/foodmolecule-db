from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="molecule",
            name="classification_reasoning",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Structured AI rationale for the harm classification.",
            ),
        ),
    ]
