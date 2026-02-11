import React, { useState } from 'react';
import { DepartmentsList } from './DepartmentsList';
import { DepartmentDetail } from './DepartmentDetail';

export const DepartmentsPage: React.FC = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);

  if (selectedDepartmentId) {
    return (
      <DepartmentDetail
        departmentId={selectedDepartmentId}
        onBack={() => setSelectedDepartmentId(null)}
      />
    );
  }

  return <DepartmentsList onSelectDepartment={(id) => setSelectedDepartmentId(id)} />;
};
