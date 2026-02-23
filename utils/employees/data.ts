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
    name: 'Shinji Ikari',
    role: 'EVA Pilot / Administrator',
    department: 'Operations',
    email: 'shinji@nerv.com',
    phone: '+81 3-1234-5678',
    location: 'Tokyo-3',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1655249481446-25d575f1c054?w=200',
  },
  {
    id: 2,
    name: 'Rei Ayanami',
    role: 'EVA Pilot',
    department: 'Operations',
    email: 'rei@nerv.com',
    phone: '+81 3-2345-6789',
    location: 'Tokyo-3',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?w=200',
  },
  {
    id: 3,
    name: 'Asuka Langley',
    role: 'EVA Pilot',
    department: 'Operations',
    email: 'asuka@nerv.com',
    phone: '+49 30-3456-7890',
    location: 'Germany',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1615702669705-0d3002c6801c?w=200',
  },
  {
    id: 4,
    name: 'Misato Katsuragi',
    role: 'Operations Director',
    department: 'Management',
    email: 'misato@nerv.com',
    phone: '+81 3-4567-8901',
    location: 'Tokyo-3',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1752860872185-78926b52ef77?w=200',
  },
];

export const employeeDepartments = ['all', 'Operations', 'Management', 'Research'];

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
