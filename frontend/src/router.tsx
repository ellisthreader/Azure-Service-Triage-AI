import { useEffect, useState } from "react";

export type Route = "home" | "dashboard";

function parse(hash: string): Route {
  return hash.replace(/^#\/?/, "") === "dashboard" ? "dashboard" : "home";
}

export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = next === "home" ? "/" : "/dashboard";
  };

  return [route, navigate];
}
