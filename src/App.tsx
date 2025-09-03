import { Link, Outlet, useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="layout">
      <header>
        <h1>Clinical Notes</h1>
        <nav>
          <Link className={pathname === "/" ? "active" : ""} to="/">
            Practitioners
          </Link>
          <Link
            className={pathname.startsWith("/patients") ? "active" : ""}
            to="/patients"
          >
            Patients
          </Link>
          <Link
            className={pathname.startsWith("/notes") ? "active" : ""}
            to="/notes"
          >
            Notes
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
