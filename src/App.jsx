import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import AppRouter from './routes/router'
import '@/assets/scss/app.scss'
import '@/assets/scss/heritos-admin.css'

// Larkon's demo axios mock (demo users, POST /login only) is for local development. Loading it
// lazily behind DEV keeps the mock adapter and demo credentials out of the production bundle.
if (import.meta.env.DEV) {
  import('./helpers/fake-backend').then(({ default: configureFakeBackend }) => configureFakeBackend())
}
function App() {
  return (
    <>
      <AppProvidersWrapper>
        <AppRouter />
      </AppProvidersWrapper>
    </>
  )
}
export default App
