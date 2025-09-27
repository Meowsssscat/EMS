"""
Employee Dashboard Routes for Flask EMS with Supabase - FIXED VERSION
Handles all employee-facing dashboard functionality with real database integration
"""

from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, current_app, flash
from datetime import datetime, timedelta, date
from sqlalchemy import func, and_, or_
from functools import wraps
import logging

# Create employee blueprint
employee_bp = Blueprint('employee_dashboard', __name__, url_prefix='/employee')

def employee_required(f):
    """Decorator to require employee authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        # Check if user role is employee or admin (admin can access employee features)
        user_role = session.get('user_role', '')
        if user_role not in ['employee', 'admin']:
            flash('Access denied. Employee access required.')
            return redirect(url_for('login'))
        
        return f(*args, **kwargs)
    return decorated_function

def get_supabase_client():
    """Get Supabase client from current app"""
    return current_app.supabase if hasattr(current_app, 'supabase') else None

@employee_bp.route('/dashboard')
@login_required
@employee_required
def dashboard():
    """Employee dashboard main page"""
    try:
        # Get employee statistics
        employee_stats = get_employee_statistics()
        
        # Get today's attendance
        today_attendance = get_today_attendance()
        
        # Get recent leave requests (last 5)
        recent_leave_requests = get_recent_leave_requests(limit=5)
        
        # Get recent notifications (last 3)
        recent_notifications = get_recent_notifications(limit=3)
        
        return render_template('employee_dashboard.html',
                             employee_stats=employee_stats,
                             today_attendance=today_attendance,
                             recent_leave_requests=recent_leave_requests,
                             recent_notifications=recent_notifications)
    
    except Exception as e:
        current_app.logger.error(f"Error loading employee dashboard: {str(e)}")
        return render_template('error.html', 
                             error_message="Unable to load dashboard. Please try again.")

@employee_bp.route('/dashboard-data')
@login_required
@employee_required
def dashboard_data():
    """API endpoint to get updated dashboard data"""
    try:
        # Get fresh data
        employee_stats = get_employee_statistics()
        today_attendance = get_today_attendance()
        recent_leave_requests = get_recent_leave_requests(limit=5)
        recent_notifications = get_recent_notifications(limit=3)
        
        # Format data for JSON response
        response_data = {
            'success': True,
            'employee_stats': employee_stats,
            'today_attendance': {
                'clock_in': today_attendance.clock_in.isoformat() if today_attendance and today_attendance.clock_in else None,
                'clock_out': today_attendance.clock_out.isoformat() if today_attendance and today_attendance.clock_out else None,
                'total_hours': float(today_attendance.total_hours) if today_attendance and today_attendance.total_hours else 0.0
            },
            'recent_leave_requests': [{
                'id': req.id,
                'leave_type': req.leave_type.name,
                'start_date': req.start_date.isoformat(),
                'end_date': req.end_date.isoformat(),
                'status': req.status,
                'days': (req.end_date - req.start_date).days + 1
            } for req in recent_leave_requests],
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        current_app.logger.error(f"Error getting dashboard data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to fetch dashboard data'
        }), 500

@employee_bp.route('/clock', methods=['POST'])
@login_required
@employee_required
def clock_in_out():
    """Handle clock in/out requests"""
    try:
        data = request.get_json()
        if not data or 'timestamp' not in data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400
        
        # Parse timestamp
        try:
            clock_time = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            # Convert to local timezone if needed
            clock_time = clock_time.replace(tzinfo=None)
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid timestamp format'
            }), 400
        
        # Get today's attendance record
        today = date.today()
        attendance_record = Attendance.query.filter_by(
            employee_id=current_user.employee.id,
            date=today
        ).first()
        
        if not attendance_record:
            # Create new attendance record for clock in
            if attendance_record is None:
                attendance_record = Attendance(
                    employee_id=current_user.employee.id,
                    date=today,
                    clock_in=clock_time,
                    status='present'
                )
                db.session.add(attendance_record)
                db.session.commit()
                
                # Create notification
                create_notification(
                    employee_id=current_user.employee.id,
                    title="Clock In Successful",
                    message=f"You clocked in at {clock_time.strftime('%I:%M %p')}",
                    type="success"
                )
                
                return jsonify({
                    'success': True,
                    'action': 'clock_in',
                    'clock_in_time': clock_time.strftime('%I:%M %p'),
                    'message': f'Successfully clocked in at {clock_time.strftime("%I:%M %p")}'
                })
        
        elif attendance_record.clock_in and not attendance_record.clock_out:
            # Clock out
            attendance_record.clock_out = clock_time
            
            # Calculate total hours
            if attendance_record.clock_in:
                time_diff = clock_time - attendance_record.clock_in
                total_hours = time_diff.total_seconds() / 3600
                attendance_record.total_hours = round(total_hours, 2)
            
            attendance_record.status = 'completed'
            db.session.commit()
            
            # Create notification
            create_notification(
                employee_id=current_user.employee.id,
                title="Clock Out Successful",
                message=f"You clocked out at {clock_time.strftime('%I:%M %p')}. Total hours: {attendance_record.total_hours}",
                type="success"
            )
            
            return jsonify({
                'success': True,
                'action': 'clock_out',
                'clock_out_time': clock_time.strftime('%I:%M %p'),
                'total_hours': float(attendance_record.total_hours),
                'message': f'Successfully clocked out at {clock_time.strftime("%I:%M %p")}'
            })
        
        else:
            # Already completed for today
            return jsonify({
                'success': False,
                'error': 'Attendance already completed for today'
            }), 400
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing clock request: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to process clock request'
        }), 500

def get_employee_statistics():
    """Get comprehensive employee statistics - FIXED VERSION"""
    try:
        # Calculate attendance rate for current month
        current_month_start = date.today().replace(day=1)
        today = date.today()
        
        # FIXED: Calculate total days in the month (like your working attendance code)
        # For September: total days = 30 (regardless of what day today is)
        import calendar
        _, total_days_in_month = calendar.monthrange(today.year, today.month)
        
        # Present days
        present_days = Attendance.query.filter(
            Attendance.employee_id == current_user.employee.id,
            Attendance.date >= current_month_start,
            Attendance.date <= today,
            Attendance.status.in_(['present', 'completed'])
        ).count()
        
        # FIXED: Calculate attendance rate based on total calendar days
        attendance_rate = (present_days / total_days_in_month * 100) if total_days_in_month > 0 else 0
        
        # Calculate attendance trend (compare with previous month)
        prev_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = current_month_start - timedelta(days=1)
        
        # For previous month, use total days in that month
        import calendar
        _, prev_total_days = calendar.monthrange(prev_month_end.year, prev_month_end.month)
        
        prev_present_days = Attendance.query.filter(
            Attendance.employee_id == current_user.employee.id,
            Attendance.date >= prev_month_start,
            Attendance.date <= prev_month_end,
            Attendance.status.in_(['present', 'completed'])
        ).count()
        
        prev_attendance_rate = (prev_present_days / prev_total_days * 100) if prev_total_days > 0 else 0
        attendance_trend = round(attendance_rate - prev_attendance_rate, 1)
        
        # Get leave balance
        leave_balance = get_leave_balance()
        
        # Count pending requests
        pending_requests = LeaveRequest.query.filter_by(
            employee_id=current_user.employee.id,
            status='pending'
        ).count()
        
        # Get department size
        department_size = Employee.query.filter_by(
            department_id=current_user.employee.department_id,
            status='active'
        ).count()
        
        return {
            'attendance_rate': round(attendance_rate, 1),
            'attendance_trend': attendance_trend,
            'leave_balance': leave_balance['annual_remaining'],
            'total_leave_days': leave_balance['annual_allocated'],
            'pending_requests': pending_requests,
            'department_size': department_size
        }
    
    except Exception as e:
        current_app.logger.error(f"Error calculating employee statistics: {str(e)}")
        return {
            'attendance_rate': 0,
            'attendance_trend': 0,
            'leave_balance': 0,
            'total_leave_days': 0,
            'pending_requests': 0,
            'department_size': 0
        }


def get_today_attendance():
    """Get today's attendance record"""
    try:
        today = date.today()
        return Attendance.query.filter_by(
            employee_id=current_user.employee.id,
            date=today
        ).first()
    
    except Exception as e:
        current_app.logger.error(f"Error getting today's attendance: {str(e)}")
        return None

def get_recent_leave_requests(limit=5):
    """Get recent leave requests for current employee"""
    try:
        return LeaveRequest.query.options(
            joinedload(LeaveRequest.leave_type)
        ).filter_by(
            employee_id=current_user.employee.id
        ).order_by(
            LeaveRequest.created_at.desc()
        ).limit(limit).all()
    
    except Exception as e:
        current_app.logger.error(f"Error getting recent leave requests: {str(e)}")
        return []

def get_recent_notifications(limit=3):
    """Get recent notifications for current employee"""
    try:
        return Notification.query.filter_by(
            employee_id=current_user.employee.id
        ).order_by(
            Notification.created_at.desc()
        ).limit(limit).all()
    
    except Exception as e:
        current_app.logger.error(f"Error getting recent notifications: {str(e)}")
        return []

def get_leave_balance():
    """Calculate current leave balance for employee - FIXED VERSION"""
    try:
        # Get current year
        current_year = datetime.now().year
        
        # FIXED: Define leave allocations clearly
        annual_leave_allocation = 20
        sick_leave_allocation = 10
        personal_leave_allocation = 5
        
        # Calculate used leave days this year by leave type
        year_start = date(current_year, 1, 1)
        year_end = date(current_year, 12, 31)
        
        # FIXED: Get actual used leave by leave type from approved requests
        leave_usage = db.session.query(
            LeaveType.name,
            func.coalesce(func.sum(LeaveRequest.days), 0).label('days_used')
        ).outerjoin(
            LeaveRequest,
            and_(
                LeaveType.id == LeaveRequest.leave_type_id,
                LeaveRequest.employee_id == current_user.employee.id,
                LeaveRequest.status == 'approved',
                LeaveRequest.start_date >= year_start,
                LeaveRequest.end_date <= year_end
            )
        ).group_by(LeaveType.name).all()
        
        # Create usage dictionary
        usage_dict = {leave_type: int(days_used) for leave_type, days_used in leave_usage}
        
        # FIXED: Calculate remaining leave by type
        annual_used = usage_dict.get('Annual Leave', 0) + usage_dict.get('Vacation', 0)  # Handle different naming
        sick_used = usage_dict.get('Sick Leave', 0)
        personal_used = usage_dict.get('Personal Leave', 0)
        
        # Calculate remaining balances
        annual_remaining = max(0, annual_leave_allocation - annual_used)
        sick_remaining = max(0, sick_leave_allocation - sick_used)
        personal_remaining = max(0, personal_leave_allocation - personal_used)
        
        total_used = annual_used + sick_used + personal_used
        total_allocated = annual_leave_allocation + sick_leave_allocation + personal_leave_allocation
        total_remaining = annual_remaining + sick_remaining + personal_remaining
        
        return {
            'annual_allocated': annual_leave_allocation,
            'annual_used': annual_used,
            'annual_remaining': annual_remaining,
            'sick_allocated': sick_leave_allocation,
            'sick_used': sick_used,
            'sick_remaining': sick_remaining,
            'personal_allocated': personal_leave_allocation,
            'personal_used': personal_used,
            'personal_remaining': personal_remaining,
            'total_allocated': total_allocated,
            'total_used': total_used,
            'total_remaining': total_remaining
        }
    
    except Exception as e:
        current_app.logger.error(f"Error calculating leave balance: {str(e)}")
        return {
            'annual_allocated': 20,
            'annual_used': 0,
            'annual_remaining': 20,
            'sick_allocated': 10,
            'sick_used': 0,
            'sick_remaining': 10,
            'personal_allocated': 5,
            'personal_used': 0,
            'personal_remaining': 5,
            'total_allocated': 35,
            'total_used': 0,
            'total_remaining': 35
        }

def get_working_days_count(start_date, end_date):
    """Calculate number of working days between two dates (excluding weekends) - FIXED VERSION"""
    try:
        current_date = start_date
        working_days = 0
        
        # FIXED: Include end_date in the count
        while current_date <= end_date:
            # Monday = 0, Sunday = 6
            if current_date.weekday() < 5:  # Monday to Friday
                working_days += 1
            current_date += timedelta(days=1)
        
        return working_days
    
    except Exception as e:
        current_app.logger.error(f"Error calculating working days: {str(e)}")
        return 0

def create_notification(employee_id, title, message, type="info"):
    """Create a new notification for an employee"""
    try:
        notification = Notification(
            employee_id=employee_id,
            title=title,
            message=message,
            type=type,
            is_read=False,
            created_at=datetime.now()
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    except Exception as e:
        current_app.logger.error(f"Error creating notification: {str(e)}")
        db.session.rollback()
        return None

# Additional routes that might be referenced in the dashboard

@employee_bp.route('/attendance')
@login_required
@employee_required
def attendance():
    """Employee attendance history page"""
    try:
        # Get attendance history for current month by default
        current_month_start = date.today().replace(day=1)
        
        # Get filter parameters from query string
        start_date = request.args.get('start_date', current_month_start.strftime('%Y-%m-%d'))
        end_date = request.args.get('end_date', date.today().strftime('%Y-%m-%d'))
        
        # Parse dates
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            start_date = current_month_start
            end_date = date.today()
        
        # Get attendance records
        attendance_records = Attendance.query.filter(
            Attendance.employee_id == current_user.employee.id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).order_by(Attendance.date.desc()).all()
        
        # Calculate summary statistics
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.status in ['present', 'completed']])
        late_days = len([a for a in attendance_records if a.status == 'late'])
        absent_days = len([a for a in attendance_records if a.status == 'absent'])
        
        total_hours = sum([a.total_hours for a in attendance_records if a.total_hours]) or 0
        
        summary = {
            'total_days': total_days,
            'present_days': present_days,
            'late_days': late_days,
            'absent_days': absent_days,
            'total_hours': round(total_hours, 2),
            'attendance_rate': round((present_days / total_days * 100) if total_days > 0 else 0, 1)
        }
        
        return render_template('employee_attendance.html',
                             attendance_records=attendance_records,
                             summary=summary,
                             start_date=start_date,
                             end_date=end_date)
    
    except Exception as e:
        current_app.logger.error(f"Error loading attendance page: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load attendance data.")

@employee_bp.route('/leave-request', methods=['GET', 'POST'])
@login_required
@employee_required
def leave_request():
    """Employee leave request page"""
    try:
        if request.method == 'POST':
            # Handle leave request submission
            leave_type_id = request.form.get('leave_type_id')
            start_date_str = request.form.get('start_date')
            end_date_str = request.form.get('end_date')
            reason = request.form.get('reason')
            
            # Validate form data
            if not all([leave_type_id, start_date_str, end_date_str, reason]):
                return render_template('employee_leave_request.html',
                                     leave_types=get_leave_types(),
                                     leave_requests=get_recent_leave_requests(),
                                     error='All fields are required.')
            
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return render_template('employee_leave_request.html',
                                     leave_types=get_leave_types(),
                                     leave_requests=get_recent_leave_requests(),
                                     error='Invalid date format.')
            
            # Validate dates
            if start_date < date.today():
                return render_template('employee_leave_request.html',
                                     leave_types=get_leave_types(),
                                     leave_requests=get_recent_leave_requests(),
                                     error='Start date cannot be in the past.')
            
            if end_date < start_date:
                return render_template('employee_leave_request.html',
                                     leave_types=get_leave_types(),
                                     leave_requests=get_recent_leave_requests(),
                                     error='End date cannot be before start date.')
            
            # Calculate days
            days = (end_date - start_date).days + 1
            
            # Check for overlapping requests
            overlapping_requests = LeaveRequest.query.filter(
                LeaveRequest.employee_id == current_user.employee.id,
                LeaveRequest.status.in_(['pending', 'approved']),
                or_(
                    and_(LeaveRequest.start_date <= start_date, LeaveRequest.end_date >= start_date),
                    and_(LeaveRequest.start_date <= end_date, LeaveRequest.end_date >= end_date),
                    and_(LeaveRequest.start_date >= start_date, LeaveRequest.end_date <= end_date)
                )
            ).first()
            
            if overlapping_requests:
                return render_template('employee_leave_request.html',
                                     leave_types=get_leave_types(),
                                     leave_requests=get_recent_leave_requests(),
                                     error='You have an overlapping leave request for these dates.')
            
            # Create leave request
            leave_request = LeaveRequest(
                employee_id=current_user.employee.id,
                leave_type_id=leave_type_id,
                start_date=start_date,
                end_date=end_date,
                days=days,
                reason=reason,
                status='pending',
                created_at=datetime.now()
            )
            
            db.session.add(leave_request)
            db.session.commit()
            
            # Create notification
            create_notification(
                employee_id=current_user.employee.id,
                title="Leave Request Submitted",
                message=f"Your leave request for {start_date} to {end_date} has been submitted for approval.",
                type="info"
            )
            
            return render_template('employee_leave_request.html',
                                 leave_types=get_leave_types(),
                                 leave_requests=get_recent_leave_requests(),
                                 success='Leave request submitted successfully!')
        
        # GET request - show form
        leave_types = get_leave_types()
        leave_requests = get_recent_leave_requests(limit=10)
        
        return render_template('employee_leave_request.html',
                             leave_types=leave_types,
                             leave_requests=leave_requests)
    
    except Exception as e:
        current_app.logger.error(f"Error processing leave request: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to process leave request.")

@employee_bp.route('/profile')
@login_required
@employee_required
def profile():
    """Employee profile page"""
    try:
        return render_template('employee_profile.html',
                             employee=current_user.employee)
    
    except Exception as e:
        current_app.logger.error(f"Error loading profile page: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load profile data.")

@employee_bp.route('/notifications')
@login_required
@employee_required
def notifications():
    """Employee notifications page"""
    try:
        # Get all notifications for the employee
        page = request.args.get('page', 1, type=int)
        per_page = 20
        
        notifications = Notification.query.filter_by(
            employee_id=current_user.employee.id
        ).order_by(
            Notification.created_at.desc()
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Mark all as read if requested
        if request.args.get('mark_all_read') == 'true':
            Notification.query.filter_by(
                employee_id=current_user.employee.id,
                is_read=False
            ).update({'is_read': True})
            db.session.commit()
            return redirect(url_for('employee.notifications'))
        
        return render_template('employee_notifications.html',
                             notifications=notifications)
    
    except Exception as e:
        current_app.logger.error(f"Error loading notifications: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load notifications.")

@employee_bp.route('/notification/<int:notification_id>/read', methods=['POST'])
@login_required
@employee_required
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.query.filter_by(
            id=notification_id,
            employee_id=current_user.employee.id
        ).first()
        
        if notification:
            notification.is_read = True
            db.session.commit()
            return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Notification not found'}), 404
    
    except Exception as e:
        current_app.logger.error(f"Error marking notification as read: {str(e)}")
        return jsonify({'success': False, 'error': 'Server error'}), 500

def get_leave_types():
    """Get all available leave types"""
    try:
        return LeaveType.query.filter_by(is_active=True).all()
    except Exception as e:
        current_app.logger.error(f"Error getting leave types: {str(e)}")
        return []

# Error handlers for employee blueprint
@employee_bp.errorhandler(404)
def employee_not_found(error):
    """Handle 404 errors in employee section"""
    return render_template('error.html',
                         error_message="Page not found in employee section."), 404

@employee_bp.errorhandler(500)
def employee_server_error(error):
    """Handle 500 errors in employee section"""
    current_app.logger.error(f"Employee section server error: {str(error)}")
    return render_template('error.html',
                         error_message="Internal server error. Please try again."), 500

# Context processors for employee blueprint
@employee_bp.context_processor
def inject_employee_data():
    """Inject commonly used employee data into templates"""
    if current_user.is_authenticated and hasattr(current_user, 'employee') and current_user.employee:
        return {
            'employee': current_user.employee,
            'unread_notifications_count': get_unread_notifications_count()
        }
    return {}

def get_unread_notifications_count():
    """Get count of unread notifications for current employee"""
    try:
        return Notification.query.filter_by(
            employee_id=current_user.employee.id,
            is_read=False
        ).count()
    except:
        return 0

# Utility functions for background tasks or scheduled jobs

def update_attendance_status():
    """Background task to update attendance status for employees who haven't clocked out"""
    try:
        # Find attendance records that are still 'present' after work hours
        cutoff_time = datetime.now().replace(hour=18, minute=0, second=0, microsecond=0)  # 6 PM
        
        overdue_attendances = Attendance.query.filter(
            Attendance.date == date.today(),
            Attendance.status == 'present',
            Attendance.clock_in < cutoff_time,
            Attendance.clock_out.is_(None)
        ).all()
        
        for attendance in overdue_attendances:
            # Auto clock-out at 6 PM
            attendance.clock_out = cutoff_time
            
            # Calculate hours
            if attendance.clock_in:
                time_diff = cutoff_time - attendance.clock_in
                attendance.total_hours = round(time_diff.total_seconds() / 3600, 2)
            
            attendance.status = 'completed'
            
            # Create notification
            create_notification(
                employee_id=attendance.employee_id,
                title="Auto Clock-Out",
                message=f"You were automatically clocked out at {cutoff_time.strftime('%I:%M %p')}",
                type="warning"
            )
        
        db.session.commit()
        current_app.logger.info(f"Updated {len(overdue_attendances)} attendance records")
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating attendance status: {str(e)}")

def generate_monthly_attendance_report(employee_id, year, month):
    """Generate monthly attendance report for an employee"""
    try:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        attendance_records = Attendance.query.filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).order_by(Attendance.date).all()
        
        # Calculate statistics
        total_working_days = get_working_days_count(start_date, end_date)
        present_days = len([a for a in attendance_records if a.status in ['present', 'completed']])
        late_days = len([a for a in attendance_records if a.status == 'late'])
        absent_days = total_working_days - present_days
        total_hours = sum([a.total_hours for a in attendance_records if a.total_hours]) or 0
        
        return {
            'employee_id': employee_id,
            'year': year,
            'month': month,
            'total_working_days': total_working_days,
            'present_days': present_days,
            'late_days': late_days,
            'absent_days': absent_days,
            'total_hours': round(total_hours, 2),
            'attendance_rate': round((present_days / total_working_days * 100) if total_working_days > 0 else 0, 1),
            'records': attendance_records
        }
        
    except Exception as e:
        current_app.logger.error(f"Error generating attendance report: {str(e)}")
        return None