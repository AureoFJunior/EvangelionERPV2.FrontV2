export type EmployeeRecord = {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  image: string;
};

export const employeesSeed: EmployeeRecord[] = [
  {
    id: 1,
    name: 'Hiroshi Tanaka',
    role: 'VP Engineering',
    department: 'Engineering',
    email: 'h.tanaka@corp.io',
    phone: '+1 (415) 872-3901',
    location: 'San Francisco, CA',
    status: 'Active',
    image: '',
  },
  {
    id: 2,
    name: 'Elena Vasquez',
    role: 'Lead Developer',
    department: 'Engineering',
    email: 'e.vasquez@corp.io',
    phone: '+1 (512) 334-7821',
    location: 'Austin, TX',
    status: 'Active',
    image: '',
  },
  {
    id: 3,
    name: 'Marcus Webb',
    role: 'Backend Engineer',
    department: 'Engineering',
    email: 'm.webb@corp.io',
    phone: '+1 (617) 881-2034',
    location: 'Boston, MA',
    status: 'Active',
    image: '',
  },
  {
    id: 4,
    name: 'Aisha Johnson',
    role: 'CFO',
    department: 'Finance',
    email: 'a.johnson@corp.io',
    phone: '+1 (415) 882-9341',
    location: 'San Francisco, CA',
    status: 'Active',
    image: '',
  },
  {
    id: 5,
    name: 'Tom Patterson',
    role: 'Finance Manager',
    department: 'Finance',
    email: 't.patterson@corp.io',
    phone: '+1 (212) 994-5512',
    location: 'New York, NY',
    status: 'Active',
    image: '',
  },
  {
    id: 6,
    name: 'Sarah Chen',
    role: 'VP Sales',
    department: 'Sales',
    email: 's.chen@corp.io',
    phone: '+1 (206) 998-1203',
    location: 'Seattle, WA',
    status: 'Active',
    image: '',
  },
  {
    id: 7,
    name: 'James Holloway',
    role: 'Account Executive',
    department: 'Sales',
    email: 'j.holloway@corp.io',
    phone: '+1 (212) 994-5512',
    location: 'New York, NY',
    status: 'On Leave',
    image: '',
  },
  {
    id: 8,
    name: 'Priya Nair',
    role: 'Customer Success',
    department: 'Sales',
    email: 'p.nair@corp.io',
    phone: '+1 (512) 334-7821',
    location: 'Austin, TX',
    status: 'Active',
    image: '',
  },
  {
    id: 9,
    name: 'David Kim',
    role: 'Head of Design',
    department: 'Design',
    email: 'd.kim@corp.io',
    phone: '+1 (303) 445-6789',
    location: 'Denver, CO',
    status: 'Active',
    image: '',
  },
  {
    id: 10,
    name: 'Anya Petrov',
    role: 'UX Designer',
    department: 'Design',
    email: 'a.petrov@corp.io',
    phone: '+1 (303) 445-6789',
    location: 'Denver, CO',
    status: 'Active',
    image: '',
  },
];

export const employeeDepartments = ['all', 'Engineering', 'Finance', 'Sales', 'Design'];

export const filterEmployees = (
  employees: EmployeeRecord[],
  searchTerm: string,
  department: string,
) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(normalizedSearch) ||
      employee.role.toLowerCase().includes(normalizedSearch);
    const matchesDepartment = department === 'all' || employee.department === department;
    return matchesSearch && matchesDepartment;
  });
};
