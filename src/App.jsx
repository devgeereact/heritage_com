import AppProvidersWrapper from './components/wrappers/AppProvidersWrapper'
import AppRouter from './routes/router'
import '@/assets/tokens/tokens.scss'
import '@/assets/scss/app.scss'
import '@/assets/scss/heritos-admin.css'

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
