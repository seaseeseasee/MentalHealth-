// Grants or removes staff roles from the command line (no web route can create the first admin).
//   node src/cli.ts set-role someone@example.com admin|analyst|user
//   node src/cli.ts list-staff
import { db } from './db.ts';

const [cmd, email, role] = process.argv.slice(2);

if (cmd === 'set-role' && email && ['admin', 'analyst', 'user'].includes(role)) {
  const info = db.prepare('UPDATE users SET role = ? WHERE email = ?').run(role, email.trim().toLowerCase());
  if (info.changes === 0) {
    console.error('ไม่พบบัญชีนี้ ผู้ใช้ต้องสมัครสมาชิกก่อน');
    process.exit(1);
  }
  db.prepare(`INSERT INTO admin_audit (admin_id, action, detail) VALUES (NULL, 'set_role_cli', ?)`).run(`${email} → ${role}`);
  console.log(`ตั้งสิทธิ์ ${email} เป็น ${role} แล้ว`);
} else if (cmd === 'list-staff') {
  console.table(db.prepare(`SELECT email, role FROM users WHERE role IN ('admin','analyst')`).all());
} else {
  console.log('usage: node src/cli.ts set-role <email> <admin|analyst|user>\n       node src/cli.ts list-staff');
  process.exit(cmd ? 1 : 0);
}
