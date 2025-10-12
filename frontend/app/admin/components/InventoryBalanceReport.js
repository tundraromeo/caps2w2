import IndividualReport from './IndividualReport';

function InventoryBalanceReport() {
  return (
    <IndividualReport 
      reportType="inventory_balance"
      reportName="Inventory Balance Report"
      reportIcon="📋"
    />
  );
}

export default InventoryBalanceReport;
