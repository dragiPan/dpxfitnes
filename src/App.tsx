import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Board from './pages/Board'
import ClientDashboard from './pages/client/Dashboard'
import CheckIn from './pages/client/CheckIn'
import MyProgram from './pages/client/MyProgram'
import MyMeals from './pages/client/MyMeals'
import Planner from './pages/client/Planner'
import Progress from './pages/client/Progress'
import Chat from './pages/client/Chat'
import Intake from './pages/client/Intake'
import CoachDashboard from './pages/coach/CoachDashboard'
import Clients from './pages/coach/Clients'
import ClientDetail from './pages/coach/ClientDetail'
import Programs from './pages/coach/Programs'
import ProgramBuilder from './pages/coach/ProgramBuilder'
import Groups from './pages/coach/Groups'
import Library from './pages/coach/Library'

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading || (session && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-2xl font-black tracking-tighter animate-pulse">DPXFITNES</p>
      </div>
    )
  }

  if (!session) return <Login />

  const isCoach = profile?.role === 'coach'

  return (
    <Routes>
      <Route element={<Layout />}>
        {isCoach ? (
          <>
            <Route path="/" element={<CoachDashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/:id" element={<ProgramBuilder />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/library" element={<Library />} />
          </>
        ) : (
          <>
            <Route path="/" element={<ClientDashboard />} />
            <Route path="/checkin" element={<CheckIn />} />
            <Route path="/program" element={<MyProgram />} />
            <Route path="/meals" element={<MyMeals />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/intake" element={<Intake />} />
          </>
        )}
        <Route path="/board" element={<Board />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
