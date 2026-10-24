import { useContext } from 'react';
import { Auth } from '../AuthContext';
import CrudPage from '../components/CrudPage';
import { fd, t5 } from '../services/api';

// Each page below is just a configuration for CrudPage (table columns + form fields).
const deptField = { name: 'department_id', label: 'Department', type: 'select', from: 'departments', value: 'department_id', opt: (r) => r.department_name };
const semField = { name: 'semester', label: 'Semester', type: 'number' };
// A coordinator only sees (and can only use) data of their own department
const useFilter = (coord) => { const { user } = useContext(Auth); return coord ? { department_id: user.department_id } : {}; };

export const Students = ({ coord }) => (
  <CrudPage title={coord ? 'Department Students' : 'Students'} res="students" pk="student_id" filter={useFilter(coord)}
    actions={coord ? [] : undefined}
    columns={[{ k: 'register_number', l: 'Register No.' }, { k: 'name', l: 'Name' }, { k: 'email', l: 'Email' },
      { k: 'department_name', l: 'Department' }, { k: 'semester', l: 'Semester' }]}
    fields={[{ name: 'register_number', label: 'Register Number' }, { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email', type: 'email' }, deptField, semField]} />
);

export const Departments = () => (
  <CrudPage title="Departments" res="departments" pk="department_id"
    columns={[{ k: 'department_name', l: 'Department' }, { k: 'students', l: 'Students' }]}
    fields={[{ name: 'department_name', label: 'Department Name' }]} />
);

export const Exams = ({ coord }) => (
  <CrudPage title="Exams" res="exams" pk="exam_id" filter={useFilter(coord)} actions={coord ? [] : undefined}
    columns={[{ k: 'subject_code', l: 'Code' }, { k: 'subject_name', l: 'Subject' },
      { k: 'semester', l: 'Semester' }, { k: 'department_name', l: 'Department' }]}
    fields={[{ name: 'subject_code', label: 'Subject Code' }, { name: 'subject_name', label: 'Subject Name' }, semField, deptField]} />
);

export const Schedules = ({ coord }) => (
  <CrudPage title="Exam Schedule" res="schedules" pk="schedule_id" filter={useFilter(coord)} actions={coord ? ['add'] : undefined}
    columns={[{ k: 'subject_name', l: 'Subject' }, { k: 'department_name', l: 'Department' },
      { k: 'exam_date', l: 'Date', f: fd }, { k: 'start_time', l: 'Start', f: t5 }, { k: 'end_time', l: 'End', f: t5 },
      { k: 'exam_date', l: 'Status', f: (v) => (v >= new Date().toISOString().slice(0, 10) ? 'Upcoming' : 'Completed') }]}
    fields={[{ name: 'exam_id', label: 'Subject', type: 'select', from: 'exams', value: 'exam_id', opt: (r) => `${r.subject_code} - ${r.subject_name}` },
      { name: 'exam_date', label: 'Exam Date', type: 'date' }, { name: 'start_time', label: 'Start Time', type: 'time' },
      { name: 'end_time', label: 'End Time', type: 'time' }]} />
);

export const Halls = () => (
  <CrudPage title="Halls" res="halls" pk="hall_id"
    columns={[{ k: 'hall_number', l: 'Hall' }, { k: 'building', l: 'Building' }, { k: 'floor_number', l: 'Floor' },
      { k: 'capacity', l: 'Capacity' }, { k: 'status', l: 'Status' }]}
    fields={[{ name: 'hall_number', label: 'Hall Number' }, { name: 'building', label: 'Building' },
      { name: 'floor_number', label: 'Floor Number', type: 'number' }, { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Available', 'Under Maintenance'] }]} />
);

export const Invigilators = () => (
  <CrudPage title="Invigilators" res="invigilators" pk="invigilator_id"
    columns={[{ k: 'employee_id', l: 'Employee ID' }, { k: 'name', l: 'Name' }, { k: 'email', l: 'Email' }, { k: 'department_name', l: 'Department' }]}
    fields={[{ name: 'employee_id', label: 'Employee ID' }, { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email', type: 'email' }, deptField]} />
);
