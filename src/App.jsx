import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper';
import configureFakeBackend from './helpers/fake-backend';
import AppRouter from './routes/router';
import '@/assets/scss/app.scss';
import '@/assets/scss/heritos-admin.css';
configureFakeBackend();
function App() {
  return <>
      <AppProvidersWrapper>
        <AppRouter />
      </AppProvidersWrapper>
    </>;
}
export default App;