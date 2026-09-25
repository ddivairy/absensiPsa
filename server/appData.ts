import { Router, Response } from 'express';
import { getPool } from './db';
import { authenticateToken, AuthenticatedRequest } from './auth';

export const appDataRouter = Router();

const dateValue = (value?: string) => value ? String(value).slice(0, 10) : null;
const dateTimeValue = (value?: string) => value ? String(value).replace('T', ' ').replace(/Z$/, '').slice(0, 19) : null;
const dateText = (value: any) => value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : '';
const dateTimeText = (value: any) => value instanceof Date ? value.toISOString() : value ? String(value).replace(' ', 'T') : undefined;

const mapAttendance = (r: any) => ({
  id: r.id, userId: r.user_id, userName: r.user_name, userNim: r.user_nim, userRole: r.user_role,
  kejuruanId: r.kejuruan_id || '', kejuruanName: r.kejuruan_name || '', date: dateText(r.attendance_date),
  checkInTime: r.check_in_time || undefined, checkOutTime: r.check_out_time || undefined,
  status: r.status, verificationStatus: r.verification_status, verifiedBy: r.verified_by || undefined,
  verifiedAt: dateTimeText(r.verified_at), location: r.location || undefined,
  coordinates: r.latitude == null || r.longitude == null ? undefined : { lat: Number(r.latitude), lng: Number(r.longitude) },
  notes: r.notes || undefined, photoUrl: r.photo_url || undefined, rejectionReason: r.rejection_reason || undefined,
});
const mapLeave = (r: any) => ({
  id: r.id, userId: r.user_id, userName: r.user_name, userNim: r.user_nim, kejuruanId: r.kejuruan_id || '',
  kejuruanName: r.kejuruan_name || '', type: r.request_type, startDate: dateText(r.start_date), endDate: dateText(r.end_date),
  daysCount: r.days_count, reason: r.reason, attachmentName: r.attachment_name || undefined,
  attachmentUrl: r.attachment_url || undefined, status: r.status, submittedAt: dateTimeText(r.submitted_at),
  reviewedBy: r.reviewed_by || undefined, reviewedAt: dateTimeText(r.reviewed_at), reviewNotes: r.review_notes || undefined,
});
const mapKejuruan = (r: any) => ({
  id: r.id, name: r.name, code: r.code, category: r.category, color: r.color,
  description: r.description || '', mentorId: r.mentor_id || undefined, mentorName: r.mentor_name || undefined,
});
const mapMission = (r: any) => ({
  id: r.id, title: r.title, description: r.description, kejuruanId: r.kejuruan_id, kejuruanName: r.kejuruan_name,
  mentorId: r.mentor_id, mentorName: r.mentor_name, points: r.points, difficulty: r.difficulty,
  dueDate: dateText(r.due_date), createdAt: dateText(r.created_at), status: r.status,
  category: r.category || undefined, submissionGuide: r.submission_guide || undefined,
});
const mapSubmission = (r: any) => ({
  id: r.id, missionId: r.mission_id, missionTitle: r.mission_title, traineeId: r.trainee_id,
  traineeName: r.trainee_name, traineeNim: r.trainee_nim, traineeAvatar: r.trainee_avatar || '',
  kejuruanId: r.kejuruan_id || '', kejuruanName: r.kejuruan_name || '', submissionLink: r.submission_link || undefined,
  notes: r.notes || '', points: r.points, submittedAt: dateTimeText(r.submitted_at), status: r.status,
  reviewedBy: r.reviewed_by || undefined, reviewedAt: dateTimeText(r.reviewed_at), feedback: r.feedback || undefined,
});
const mapReport = (r: any) => ({
  id: r.id, traineeId: r.trainee_id, traineeName: r.trainee_name, traineeNim: r.trainee_nim,
  traineeAvatar: r.trainee_avatar || '', kejuruanId: r.kejuruan_id || '', kejuruanName: r.kejuruan_name || '',
  date: dateText(r.report_date), description: r.description, photoUrl: r.photo_url || undefined,
  photoName: r.photo_name || undefined, submissionLink: r.submission_link || undefined, status: r.status,
  submittedAt: dateTimeText(r.submitted_at), reviewedBy: r.reviewed_by || undefined,
  reviewedAt: dateTimeText(r.reviewed_at), reviewNotes: r.review_notes || undefined,
});

appDataRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const pool = getPool();
    const scope = user.role === 'admin' ? null : user.role === 'mentor' ? user.kejuruanId || '' : user.id;
    const [kejuruanRows] = await pool.query<any[]>(scope === null
      ? 'SELECT * FROM kejuruan ORDER BY name'
      : user.role === 'mentor'
        ? 'SELECT * FROM kejuruan WHERE id = ? OR mentor_id = ? ORDER BY name'
        : 'SELECT * FROM kejuruan WHERE id = ? ORDER BY name',
    scope === null ? [] : user.role === 'mentor' ? [scope, user.id] : [user.kejuruanId || '']);

    const scopedQuery = async (table: string, field: string, value: string | null) => {
      const [rows] = await pool.query<any[]>(value === null ? `SELECT * FROM ${table}` : `SELECT * FROM ${table} WHERE ${field} = ?`, value === null ? [] : [value]);
      return rows;
    };
    const [attendanceRows, leaveRows, missionRows, submissionRows, reportRows, settingRows] = await Promise.all([
      scopedQuery('attendance_records', user.role === 'admin' ? '' : user.role === 'mentor' ? 'kejuruan_id' : 'user_id', scope),
      scopedQuery('leave_requests', user.role === 'admin' ? '' : user.role === 'mentor' ? 'kejuruan_id' : 'user_id', scope),
      scopedQuery('missions', user.role === 'admin' ? '' : 'kejuruan_id', user.role === 'admin' ? null : user.kejuruanId || ''),
      scopedQuery('mission_submissions', user.role === 'admin' ? '' : user.role === 'mentor' ? 'kejuruan_id' : 'trainee_id', scope),
      scopedQuery('daily_reports', user.role === 'admin' ? '' : user.role === 'mentor' ? 'kejuruan_id' : 'trainee_id', scope),
      pool.query<any[]>('SELECT * FROM attendance_settings ORDER BY updated_at DESC LIMIT 1'),
    ]);
    const setting = settingRows[0][0];
    return res.json({
      success: true,
      kejuruanList: kejuruanRows.map(mapKejuruan),
      attendanceRecords: attendanceRows.map(mapAttendance),
      leaveRequests: leaveRows.map(mapLeave),
      missions: missionRows.map(mapMission),
      missionSubmissions: submissionRows.map(mapSubmission),
      dailyReports: reportRows.map(mapReport),
      settings: setting ? {
        startTime: setting.start_time, lateLimitTime: setting.late_limit_time, endTime: setting.end_time,
        allowCheckoutStart: setting.allow_checkout_start,
        workDays: typeof setting.work_days === 'string' ? JSON.parse(setting.work_days) : setting.work_days,
        officeLocation: typeof setting.office_location === 'string' ? JSON.parse(setting.office_location) : setting.office_location,
      } : null,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat data aplikasi dari TiDB.', error: error.message });
  }
});

appDataRouter.put('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const body = req.body || {};
  const collections = ['kejuruanList', 'attendanceRecords', 'leaveRequests', 'missions', 'missionSubmissions', 'dailyReports'] as const;
  const lists: Record<string, any[]> = {};
  for (const key of collections) lists[key] = Array.isArray(body[key]) ? body[key] : [];

  const own = (row: any) => row && (row.userId === user.id || row.traineeId === user.id);
  const inKejuruan = (row: any) => row && user.kejuruanId && row.kejuruanId === user.kejuruanId;
  if (user.role === 'trainee') {
    if (lists.kejuruanList.length || lists.missions.length || body.settings) {
      return res.status(403).json({ success: false, message: 'Peserta tidak diizinkan mengubah data master.' });
    }
    for (const key of ['attendanceRecords', 'leaveRequests', 'missionSubmissions', 'dailyReports']) {
      if (lists[key].some(row => !own(row))) return res.status(403).json({ success: false, message: 'Perubahan hanya boleh dilakukan pada data akun sendiri.' });
    }
  } else if (user.role === 'mentor') {
    if (lists.kejuruanList.length || body.settings) return res.status(403).json({ success: false, message: 'Mentor tidak diizinkan mengubah data master.' });
    for (const key of collections.filter(k => k !== 'kejuruanList')) {
      if (lists[key].some(row => !inKejuruan(row))) return res.status(403).json({ success: false, message: 'Mentor hanya dapat mengelola data kejuruan sendiri.' });
    }
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const upsert = async (sql: string, params: any[]) => connection.query(sql, params);
    for (const r of lists.kejuruanList) await upsert(
      `INSERT INTO kejuruan (id,name,code,category,color,description,mentor_id,mentor_name) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),code=VALUES(code),category=VALUES(category),color=VALUES(color),description=VALUES(description),mentor_id=VALUES(mentor_id),mentor_name=VALUES(mentor_name)`,
      [r.id,r.name,r.code,r.category,r.color,r.description || '',r.mentorId || null,r.mentorName || null]);

    for (const r of lists.attendanceRecords) {
      if (user.role === 'trainee' && !own(r)) continue;
      const reviewUpdate = user.role === 'trainee'
        ? 'user_name=VALUES(user_name),user_nim=VALUES(user_nim),check_in_time=VALUES(check_in_time),check_out_time=VALUES(check_out_time),status=VALUES(status),location=VALUES(location),latitude=VALUES(latitude),longitude=VALUES(longitude),notes=VALUES(notes),photo_url=VALUES(photo_url)'
        : 'user_name=VALUES(user_name),user_nim=VALUES(user_nim),user_role=VALUES(user_role),kejuruan_id=VALUES(kejuruan_id),kejuruan_name=VALUES(kejuruan_name),attendance_date=VALUES(attendance_date),check_in_time=VALUES(check_in_time),check_out_time=VALUES(check_out_time),status=VALUES(status),verification_status=VALUES(verification_status),verified_by=VALUES(verified_by),verified_at=VALUES(verified_at),location=VALUES(location),latitude=VALUES(latitude),longitude=VALUES(longitude),notes=VALUES(notes),photo_url=VALUES(photo_url),rejection_reason=VALUES(rejection_reason)';
      await upsert(`INSERT INTO attendance_records (id,user_id,user_name,user_nim,user_role,kejuruan_id,kejuruan_name,attendance_date,check_in_time,check_out_time,status,verification_status,verified_by,verified_at,location,latitude,longitude,notes,photo_url,rejection_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE ${reviewUpdate}`,
      [r.id,r.userId,r.userName,r.userNim,r.userRole || 'trainee',r.kejuruanId || null,r.kejuruanName || null,dateValue(r.date),r.checkInTime || null,r.checkOutTime || null,r.status,user.role === 'trainee' ? 'pending' : r.verificationStatus,user.role === 'trainee' ? null : r.verifiedBy || null,user.role === 'trainee' ? null : dateTimeValue(r.verifiedAt),r.location || null,r.coordinates?.lat ?? null,r.coordinates?.lng ?? null,r.notes || null,r.photoUrl || null,user.role === 'trainee' ? null : r.rejectionReason || null]);
    }

    for (const r of lists.leaveRequests) {
      if (user.role === 'trainee' && !own(r)) continue;
      const reviewUpdate = user.role === 'trainee'
        ? 'reason=VALUES(reason),attachment_name=VALUES(attachment_name),attachment_url=VALUES(attachment_url)'
        : 'status=VALUES(status),reviewed_by=VALUES(reviewed_by),reviewed_at=VALUES(reviewed_at),review_notes=VALUES(review_notes),reason=VALUES(reason),attachment_name=VALUES(attachment_name),attachment_url=VALUES(attachment_url)';
      await upsert(`INSERT INTO leave_requests (id,user_id,user_name,user_nim,kejuruan_id,kejuruan_name,request_type,start_date,end_date,days_count,reason,attachment_name,attachment_url,status,submitted_at,reviewed_by,reviewed_at,review_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE ${reviewUpdate}`,
      [r.id,r.userId,r.userName,r.userNim,r.kejuruanId || null,r.kejuruanName || null,r.type,dateValue(r.startDate),dateValue(r.endDate),r.daysCount,r.reason,r.attachmentName || null,r.attachmentUrl || null,user.role === 'trainee' ? 'pending' : r.status,dateTimeValue(r.submittedAt),user.role === 'trainee' ? null : r.reviewedBy || null,user.role === 'trainee' ? null : dateTimeValue(r.reviewedAt),user.role === 'trainee' ? null : r.reviewNotes || null]);
    }

    for (const r of lists.missions) await upsert(`INSERT INTO missions (id,title,description,kejuruan_id,kejuruan_name,mentor_id,mentor_name,points,difficulty,due_date,created_at,status,category,submission_guide) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),description=VALUES(description),kejuruan_id=VALUES(kejuruan_id),kejuruan_name=VALUES(kejuruan_name),mentor_id=VALUES(mentor_id),mentor_name=VALUES(mentor_name),points=VALUES(points),difficulty=VALUES(difficulty),due_date=VALUES(due_date),status=VALUES(status),category=VALUES(category),submission_guide=VALUES(submission_guide)`,
      [r.id,r.title,r.description,r.kejuruanId,r.kejuruanName,r.mentorId,r.mentorName,r.points,r.difficulty,dateValue(r.dueDate),dateTimeValue(r.createdAt),r.status,r.category || null,r.submissionGuide || null]);

    for (const r of lists.missionSubmissions) {
      if (user.role === 'trainee' && !own(r)) continue;
      const reviewUpdate = user.role === 'trainee'
        ? 'submission_link=VALUES(submission_link),notes=VALUES(notes),submitted_at=VALUES(submitted_at)'
        : 'mission_title=VALUES(mission_title),submission_link=VALUES(submission_link),notes=VALUES(notes),points=VALUES(points),status=VALUES(status),reviewed_by=VALUES(reviewed_by),reviewed_at=VALUES(reviewed_at),feedback=VALUES(feedback)';
      await upsert(`INSERT INTO mission_submissions (id,mission_id,mission_title,trainee_id,trainee_name,trainee_nim,trainee_avatar,kejuruan_id,kejuruan_name,submission_link,notes,points,submitted_at,status,reviewed_by,reviewed_at,feedback) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE ${reviewUpdate}`,
      [r.id,r.missionId,r.missionTitle,r.traineeId,r.traineeName,r.traineeNim,r.traineeAvatar || null,r.kejuruanId || null,r.kejuruanName || null,r.submissionLink || null,r.notes || '',r.points,dateTimeValue(r.submittedAt),user.role === 'trainee' ? 'pending' : r.status,user.role === 'trainee' ? null : r.reviewedBy || null,user.role === 'trainee' ? null : dateTimeValue(r.reviewedAt),user.role === 'trainee' ? null : r.feedback || null]);
    }

    for (const r of lists.dailyReports) {
      if (user.role === 'trainee' && !own(r)) continue;
      const reviewUpdate = user.role === 'trainee'
        ? 'description=VALUES(description),photo_url=VALUES(photo_url),photo_name=VALUES(photo_name),submission_link=VALUES(submission_link),submitted_at=VALUES(submitted_at)'
        : 'description=VALUES(description),photo_url=VALUES(photo_url),photo_name=VALUES(photo_name),submission_link=VALUES(submission_link),status=VALUES(status),reviewed_by=VALUES(reviewed_by),reviewed_at=VALUES(reviewed_at),review_notes=VALUES(review_notes)';
      await upsert(`INSERT INTO daily_reports (id,trainee_id,trainee_name,trainee_nim,trainee_avatar,kejuruan_id,kejuruan_name,report_date,description,photo_url,photo_name,submission_link,status,submitted_at,reviewed_by,reviewed_at,review_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE ${reviewUpdate}`,
      [r.id,r.traineeId,r.traineeName,r.traineeNim,r.traineeAvatar || null,r.kejuruanId || null,r.kejuruanName || null,dateValue(r.date),r.description,r.photoUrl || null,r.photoName || null,r.submissionLink || null,user.role === 'trainee' ? 'pending' : r.status,dateTimeValue(r.submittedAt),user.role === 'trainee' ? null : r.reviewedBy || null,user.role === 'trainee' ? null : dateTimeValue(r.reviewedAt),user.role === 'trainee' ? null : r.reviewNotes || null]);
    }

    if (user.role === 'admin' && body.settings) {
      const s = body.settings;
      await upsert(`INSERT INTO attendance_settings (id,start_time,late_limit_time,end_time,allow_checkout_start,work_days,office_location,updated_by) VALUES ('global',?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE start_time=VALUES(start_time),late_limit_time=VALUES(late_limit_time),end_time=VALUES(end_time),allow_checkout_start=VALUES(allow_checkout_start),work_days=VALUES(work_days),office_location=VALUES(office_location),updated_by=VALUES(updated_by)`,
      [s.startTime,s.lateLimitTime,s.endTime,s.allowCheckoutStart,JSON.stringify(s.workDays),JSON.stringify(s.officeLocation),user.id]);
    }

    await connection.commit();
    return res.json({ success: true, message: 'Data aplikasi tersimpan di TiDB.' });
  } catch (error: any) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Gagal menyimpan data aplikasi ke TiDB.', error: error.message });
  } finally {
    connection.release();
  }
});

appDataRouter.delete('/:collection/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { collection, id } = req.params;
  const user = req.user!;
  const allowedTables: Record<string, { table: string; scopeColumn?: string }> = {
    kejuruanList: { table: 'kejuruan' },
    attendanceRecords: { table: 'attendance_records', scopeColumn: user.role === 'trainee' ? 'user_id' : 'kejuruan_id' },
    leaveRequests: { table: 'leave_requests', scopeColumn: user.role === 'trainee' ? 'user_id' : 'kejuruan_id' },
    missions: { table: 'missions', scopeColumn: 'kejuruan_id' },
    missionSubmissions: { table: 'mission_submissions', scopeColumn: user.role === 'trainee' ? 'trainee_id' : 'kejuruan_id' },
    dailyReports: { table: 'daily_reports', scopeColumn: user.role === 'trainee' ? 'trainee_id' : 'kejuruan_id' },
  };
  const target = allowedTables[collection];
  if (!target || (collection === 'kejuruanList' && user.role !== 'admin')) {
    return res.status(403).json({ success: false, message: 'Tidak diizinkan menghapus data ini.' });
  }
  try {
    const pool = getPool();
    if (user.role === 'admin') {
      await pool.query(`DELETE FROM ${target.table} WHERE id = ?`, [id]);
    } else {
      const scopeValue = user.role === 'trainee' ? user.id : user.kejuruanId || '';
      await pool.query(`DELETE FROM ${target.table} WHERE id = ? AND ${target.scopeColumn} = ?`, [id, scopeValue]);
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus data dari TiDB.', error: error.message });
  }
});
