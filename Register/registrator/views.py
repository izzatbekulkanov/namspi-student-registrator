import calendar
from datetime import date

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.utils.timezone import now
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.db.models import Count, Q
from members.models import DailyWorkWindow, OperatorProfile, CustomUser
from .models import Section, SubService, AssignedService
from .forms import SectionForm, SubServiceForm, AssignedServiceForm
from queueing.models import QueueTicket
from django.utils.timezone import localdate

@login_required
def dashboard(request):
    today = now().date()

    # Bugungi oyna holatini olish
    try:
        work_window = DailyWorkWindow.objects.get(operator=request.user, date=today)
        has_window = True
        window_number = work_window.window_number
        is_leader = work_window.is_leader
    except DailyWorkWindow.DoesNotExist:
        has_window = False
        window_number = None
        is_leader = False

    # Bugungi va umumiy xizmatlar soni
    today_count = QueueTicket.objects.filter(
        served_by=request.user,
        status='done',
        ended_at__date=today
    ).count()

    total_count = QueueTicket.objects.filter(
        served_by=request.user,
        status='done'
    ).count()

    # Operator darajasi
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

    return render(request, 'services/dashboard.html', {
        'has_window': has_window,
        'window_number': window_number,
        'is_leader': is_leader,
        'today_count': today_count,
        'total_count': total_count,
        'level': level,
        'level_icon': level_icon,
        'today': today,  # agar boshqa joyda ham kerak bo‘lsa
    })


@require_POST
@login_required
def set_daily_window(request):
    today = now().date()
    is_leader = request.POST.get("is_leader") == "yes"  # "yes" bo‘lsa True

    if is_leader:
        window_number = None  # Rahbarga oyna raqami kerak emas
    else:
        window_number = request.POST.get("window_number")
        if not window_number:
            messages.error(request, "Oyna raqami kiritilishi shart.")
            return redirect("service-dashboard")

    DailyWorkWindow.objects.update_or_create(
        operator=request.user,
        date=today,
        defaults={
            "window_number": int(window_number) if window_number else None,
            "is_leader": is_leader
        }
    )
    return redirect("service-dashboard")


def service_dashboard(request):
    sections = Section.objects.all()
    subservices = SubService.objects.select_related('section')
    assignments = AssignedService.objects.select_related('user', 'service')

    active_tab = request.session.pop("active_tab", "section")

    if request.method == "POST":
        active_tab = request.POST.get("active_tab", "section")
        request.session["active_tab"] = active_tab

        if 'section_submit' in request.POST:
            form = SectionForm(request.POST)
            if form.is_valid():
                form.save()
                messages.success(request, "Bo‘lim muvaffaqiyatli saqlandi.")
                return redirect("service-services")

        elif 'subservice_submit' in request.POST:
            form = SubServiceForm(request.POST)
            if form.is_valid():
                form.save()
                messages.success(request, "Xizmat muvaffaqiyatli qo‘shildi.")
                return redirect("service-services")

    context = {
        'sections': sections,
        'subservices': subservices,
        'section_form': SectionForm(),
        'subservice_form': SubServiceForm(),
        'assigned_form': AssignedServiceForm(),
        'active_tab': active_tab,
    }
    return render(request, 'services/services.html', context)


def delete_section(request, pk):
    section = get_object_or_404(Section, pk=pk)
    if request.method == 'POST':
        section.delete()
        messages.success(request, "Bo‘lim o‘chirildi.")
        return redirect(f"{request.META.get('HTTP_REFERER', '/')}?tab=section")
    return redirect('service-dashboard')


def delete_subservice(request, pk):
    subservice = get_object_or_404(SubService, pk=pk)
    if request.method == 'POST':
        subservice.delete()
        messages.success(request, "Xizmat o‘chirildi.")
        return redirect(f"{request.META.get('HTTP_REFERER', '/')}?tab=subservice")
    return redirect('service-dashboard')


def delete_assignment(request, pk):
    assignment = get_object_or_404(AssignedService, pk=pk)
    if request.method == 'POST':
        assignment.delete()
        messages.success(request, "Biriktirish o‘chirildi.")
        return redirect(f"{request.META.get('HTTP_REFERER', '/')}?tab=assign")
    return redirect('service-dashboard')



@login_required
def operator_queue_view(request):
    today = now().date()

    assigned_services = AssignedService.objects.filter(
        user=request.user
    ).values_list('service_id', flat=True)
    assigned_services = list(assigned_services)

    waiting_tickets = QueueTicket.objects.filter(
        service_id__in=assigned_services,
        status="waiting"
    ).select_related('service', 'service__section').order_by('created_at')

    serving_ticket = QueueTicket.objects.filter(
        service_id__in=assigned_services,
        status="serving",
        served_by=request.user
    ).select_related('service', 'service__section').first()

    # Operatorning bugungi oyna raqami
    work_window = DailyWorkWindow.objects.filter(operator=request.user, date=today).first()
    window_number = work_window.window_number if work_window else None

    # Faqat bugungi yakunlangan xizmatlar
    done_tickets = QueueTicket.objects.filter(
        service_id__in=assigned_services,
        status="done",
        served_by=request.user,
        ended_at__date=today
    ).select_related('service', 'service__section').order_by('-ended_at')[:30]

    for d in done_tickets:
        if d.started_at and d.ended_at:
            delta = d.ended_at - d.started_at
            total_seconds = int(delta.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            d.duration_display = f"{minutes} daq {seconds} son"
        else:
            d.duration_display = "-"

    # Operator statistikasi
    profile, _ = OperatorProfile.objects.get_or_create(operator=request.user)
    today_count = QueueTicket.objects.filter(served_by=request.user, status='done', ended_at__date=today).count()

    just_served_ticket = request.session.pop('just_served_ticket', None)
    just_served_window = request.session.pop('just_served_window', None)

    return render(request, 'services/operator_queue.html', {
        'waiting_tickets': waiting_tickets,
        'serving_ticket': serving_ticket,
        'done_tickets': done_tickets,
        'window_number': window_number,
        'profile': profile,
        'today_count': today_count,
        'waiting_count': waiting_tickets.count(),
        'just_served_ticket': just_served_ticket,
        'just_served_window': just_served_window or window_number,
    })


@login_required
def ajax_waiting_tickets(request):
    assigned = AssignedService.objects.filter(user=request.user).values_list('service_id', flat=True)
    waiting_tickets = QueueTicket.objects.filter(
        service_id__in=assigned, status='waiting'
    ).select_related('service', 'service__section').order_by('created_at')
    html = render_to_string('services/_waiting_tickets.html', {'waiting_tickets': waiting_tickets}, request=request)
    return JsonResponse({'html': html, 'count': waiting_tickets.count()})


@login_required
def ajax_serving_ticket(request):
    today = now().date()
    assigned = AssignedService.objects.filter(user=request.user).values_list('service_id', flat=True)
    serving_ticket = QueueTicket.objects.filter(
        service_id__in=assigned, status='serving', served_by=request.user
    ).select_related('service', 'service__section').first()

    work_window = DailyWorkWindow.objects.filter(operator=request.user, date=today).first()
    window_number = work_window.window_number if work_window else (serving_ticket.window_number if serving_ticket else None)

    html = render_to_string('services/_serving_ticket.html', {
        'serving_ticket': serving_ticket,
        'window_number': window_number,
    }, request=request)
    return JsonResponse({
        'html': html,
        'has_ticket': bool(serving_ticket),
        'ticket_id': serving_ticket.id if serving_ticket else None,
        'ticket_number': serving_ticket.ticket_number if serving_ticket else None,
        'window_number': window_number,
    })


@login_required
def ajax_done_tickets(request):
    today = now().date()
    assigned_services = AssignedService.objects.filter(user=request.user).values_list('service_id', flat=True)

    done_tickets = QueueTicket.objects.filter(
        service_id__in=assigned_services,
        status="done",
        served_by=request.user,
        ended_at__date=today
    ).select_related('service', 'service__section').order_by('-ended_at')[:30]

    for ticket in done_tickets:
        if ticket.started_at and ticket.ended_at:
            delta = ticket.ended_at - ticket.started_at
            seconds = int(delta.total_seconds())
            m, s = divmod(seconds, 60)
            ticket.duration_display = f"{m} daq {s} son"
        else:
            ticket.duration_display = "-"

    html = render_to_string("services/_done_tickets.html", {
        "done_tickets": done_tickets
    }, request=request)

    return JsonResponse({"html": html, "count": done_tickets.count()})


@require_POST
@login_required
def serve_ticket(request, ticket_id):
    ticket = get_object_or_404(QueueTicket, id=ticket_id)
    assigned_services = AssignedService.objects.filter(user=request.user).values_list('service_id', flat=True)

    print(f"🆔 Operator: {request.user.username} | Ticket ID: {ticket_id} | Status: {ticket.status}")

    if ticket.service_id in assigned_services and ticket.status == "waiting":
        print(f"✅ {ticket.ticket_number} xizmat navbatda — qabul qilishga ruxsat bor.")

        # Avval yakunlanmagan xizmat bormi?
        existing_serving = QueueTicket.objects.filter(
            service_id__in=assigned_services,
            status="serving",
            served_by=request.user
        ).first()

        if existing_serving:
            print(f"⚠️ Avvalgi xizmat yakunlanmagan: {existing_serving.ticket_number}")
            messages.error(request, f"❗️ Avval {existing_serving.ticket_number} raqamli xizmatni yakunlang.")
            return redirect('operator-queue')

        # Operatorning bugungi oyna raqamini aniqlash
        today = now().date()
        try:
            work_window = DailyWorkWindow.objects.get(operator=request.user, date=today)
            operator_window = work_window.window_number
            print(f"🪟 Operatorning bugungi oyna raqami: {operator_window}")
        except DailyWorkWindow.DoesNotExist:
            operator_window = None
            print("⚠️ Oyna raqami topilmadi")

        # Yangi xizmatni boshlash
        ticket.status = "serving"
        ticket.started_at = now()
        ticket.served_by = request.user
        ticket.window_number = operator_window
        ticket.save()

        print(f"🚀 Xizmat boshlandi: {ticket.ticket_number} | Operator: {request.user.get_full_name()} | Vaqt: {ticket.started_at.strftime('%H:%M:%S')}")

        messages.success(request, f"{ticket.ticket_number} - xizmat qabul qilindi.")

    else:
        print(f"❌ Ruxsat yo'q yoki ticket allaqachon qabul qilingan: {ticket.ticket_number}")

    return redirect('operator-queue')


def update_operator_profile(user, is_completed=True):
    profile, _ = OperatorProfile.objects.get_or_create(operator=user)
    if is_completed:
        profile.add_served()


@require_POST
@login_required
def complete_ticket(request, ticket_id):
    ticket = get_object_or_404(QueueTicket, id=ticket_id, served_by=request.user, status="serving")
    ticket.status = "done"
    ticket.result = "completed"
    ticket.ended_at = timezone.now()
    ticket.save()

    # Faqat bajarilgan bo‘lsa xizmat sonini oshiramiz
    update_operator_profile(request.user, is_completed=True)

    messages.success(request, f"✅ {ticket.ticket_number} - xizmat bajarildi!")
    return redirect('operator-queue')


@require_POST
@login_required
def cancel_ticket(request, ticket_id):
    ticket = get_object_or_404(QueueTicket, id=ticket_id, served_by=request.user, status="serving")
    ticket.status = "done"
    ticket.result = "rejected"
    ticket.ended_at = timezone.now()
    ticket.save()

    # Rad etilgan bo‘lsa son oshmaydi
    update_operator_profile(request.user, is_completed=False)

    messages.error(request, f"❌ {ticket.ticket_number} - xizmat rad etildi.")
    return redirect('operator-queue')


def statistics_display_view(request):
    today = date.today()
    selected_year = int(request.GET.get("year", today.year))
    selected_month = int(request.GET.get("month", today.month))
    selected_day = request.GET.get("day")

    # Base query for all tickets in the selected month & year
    base_month_tickets = QueueTicket.objects.filter(
        status="done",
        created_at__year=selected_year,
        created_at__month=selected_month,
    )

    if selected_day:
        filtered_tickets = base_month_tickets.filter(created_at__day=int(selected_day))
    else:
        filtered_tickets = base_month_tickets

    # Barcha faol xodimlar
    users = CustomUser.objects.filter(is_active=True).order_by("-is_leader", "-is_operator", "first_name", "username")

    staff_stats = []
    total_month_completed = 0
    total_month_rejected = 0
    total_month_total = 0

    total_today_completed = 0
    total_today_rejected = 0
    total_today_total = 0

    for user in users:
        # Tanlangan davr (oy yoki aniq kun) bo‘yicha chiptalar
        user_tickets = filtered_tickets.filter(served_by=user)
        m_completed = user_tickets.filter(result="completed").count()
        m_rejected = user_tickets.filter(result="rejected").count()
        m_total = user_tickets.count()

        # Bugungi kun bo‘yicha
        user_today_tickets = QueueTicket.objects.filter(
            served_by=user,
            status="done",
            created_at__date=today
        )
        t_completed = user_today_tickets.filter(result="completed").count()
        t_rejected = user_today_tickets.filter(result="rejected").count()
        t_total = user_today_tickets.count()

        # Jami butun faoliyat davomida
        user_all_tickets = QueueTicket.objects.filter(served_by=user, status="done")
        all_completed = user_all_tickets.filter(result="completed").count()
        all_rejected = user_all_tickets.filter(result="rejected").count()
        all_total = user_all_tickets.count()

        total_month_completed += m_completed
        total_month_rejected += m_rejected
        total_month_total += m_total

        total_today_completed += t_completed
        total_today_rejected += t_rejected
        total_today_total += t_total

        staff_stats.append({
            "user": user,
            "role": user.role_title(),
            "department": user.department_name or "Bo‘limsiz",
            "position": user.staff_position or "Operator",
            # Tanlangan oy / kun
            "month_completed": m_completed,
            "month_rejected": m_rejected,
            "month_total": m_total,
            # Bugun
            "today_completed": t_completed,
            "today_rejected": t_rejected,
            "today_total": t_total,
            # Jami
            "all_completed": all_completed,
            "all_rejected": all_rejected,
            "all_total": all_total,
            "level": getattr(getattr(user, "operatorprofile", None), "level", "Boshlovchi"),
        })

    # Oydagi kunlar ro‘yxati
    days_in_month = range(1, calendar.monthrange(selected_year, selected_month)[1] + 1)

    UZBEK_MONTHS = [
        (1, "Yanvar"),
        (2, "Fevral"),
        (3, "Mart"),
        (4, "Aprel"),
        (5, "May"),
        (6, "Iyun"),
        (7, "Iyul"),
        (8, "Avgust"),
        (9, "Sentabr"),
        (10, "Oktabr"),
        (11, "Noyabr"),
        (12, "Dekabr"),
    ]

    selected_month_name = dict(UZBEK_MONTHS).get(selected_month, "")

    context = {
        "staff_stats": staff_stats,
        "selected_year": selected_year,
        "selected_month": selected_month,
        "selected_month_name": selected_month_name,
        "selected_day": selected_day,
        "days_in_month": days_in_month,
        "years": range(today.year - 5, today.year + 1),
        "months": UZBEK_MONTHS,
        "summary": {
            "month_completed": total_month_completed,
            "month_rejected": total_month_rejected,
            "month_total": total_month_total,
            "today_completed": total_today_completed,
            "today_rejected": total_today_rejected,
            "today_total": total_today_total,
        }
    }
    return render(request, "queueing/statistics_display.html", context)