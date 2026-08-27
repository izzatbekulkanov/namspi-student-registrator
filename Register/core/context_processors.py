from django.utils.timezone import now
from members.models import DailyWorkWindow, OperatorProfile
from queueing.models import QueueTicket


def global_user_context(request):
    if request.user.is_authenticated:
        today = now().date()

        work_window = DailyWorkWindow.objects.filter(operator=request.user, date=today).first()
        if work_window:
            has_window = True
            window_number = work_window.window_number
            is_leader = work_window.is_leader
        else:
            has_window = False
            window_number = None
            is_leader = False

        today_count = QueueTicket.objects.filter(
            served_by=request.user,
            status='done',
            ended_at__date=today
        ).count()

        total_count = QueueTicket.objects.filter(
            served_by=request.user,
            status='done'
        ).count()

        profile, _ = OperatorProfile.objects.get_or_create(operator=request.user)
        level = profile.level or "Boshlovchi"

        level_icons = {
            "Boshlovchi": "bi bi-shield-check text-success",
            "Oddiy": "bi bi-star-fill text-primary",
            "Yaxshi": "bi bi-award-fill text-warning",
            "Usta": "bi bi-fire text-danger",
            "VIP": "bi bi-gem text-info"
        }
        level_icon = level_icons.get(level, "bi bi-shield-check text-success")

        return {
            'has_window': has_window,
            'window_number': window_number,
            'is_leader': is_leader,
            'today_count': today_count,
            'total_count': total_count,
            'level': level,
            'level_icon': level_icon,
            'today': today,
        }

    return {}
