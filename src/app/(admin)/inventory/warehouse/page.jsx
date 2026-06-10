import PageTItle from '@/components/PageTItle';
import StockData from './components/StockData';
import WarehouseList from './components/WarehouseList';
const WarehousePage = () => {
  return <>
      <PageTItle title="Warehouse List" />
      <StockData />
      <WarehouseList />
    </>;
};
export default WarehousePage;