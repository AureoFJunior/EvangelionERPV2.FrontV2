import { useMemo, useState } from 'react';
import {
  employeeDepartments,
  employeesSeed,
  filterEmployees,
} from '../../utils/employees/data';

export function useEmployees() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');

  const filteredEmployees = useMemo(
    () => filterEmployees(employeesSeed, searchTerm, filterDepartment),
    [searchTerm, filterDepartment],
  );

  return {
    searchTerm,
    setSearchTerm,
    filterDepartment,
    setFilterDepartment,
    departments: employeeDepartments,
    filteredEmployees,
  };
}
