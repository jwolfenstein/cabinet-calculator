import React from "react";
import StartPage from "./routes/Start";
import SOMPage from "./routes/SOM";
import JobPage from "./routes/Job";   // <-- add this
import RoomsPage from "./routes/Rooms"; // or "./routes/Rooms/index"
import CreateCabinetsPage from "./routes/Create";
import BuildPage from "./routes/Build";

export default function App() {
  const [path, setPath] = React.useState(window.location.pathname);
  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path === "/" || path === "/routes/Start" || path === "/index.html") return <StartPage />;
  if (path.startsWith("/routes/SOM")) return <SOMPage />;
  if (path.startsWith("/routes/Job")) return <JobPage />;   // <-- route here
  if (path === "/routes/Rooms") {
  return <RoomsPage />;     
}  
  if (path === "/routes/Create") return <CreateCabinetsPage />;
  if (path === "/routes/Build") return <BuildPage />;
return <StartPage />;
}
