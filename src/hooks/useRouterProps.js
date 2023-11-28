import { useLocation } from 'react-router-dom';

export function useRouterProps() {
    const location = useLocation();

    // Add other router props as needed
    return { location };
}