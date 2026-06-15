import PageTitle from '@/components/PageTitle';
import StockData from './components/StockData';
import WarehouseList from './components/WarehouseList';
const WarehousePage = () => {
  return <>
      <PageTitle title="Warehouse List" />
      <StockData />
      <WarehouseList />
    </>;
};
export default WarehousePage;