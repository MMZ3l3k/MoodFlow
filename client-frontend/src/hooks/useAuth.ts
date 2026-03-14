import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { logoutThunk } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, accessToken, isLoading, error } = useSelector((state: RootState) => state.auth);

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated: !!accessToken,
    handleLogout: () => dispatch(logoutThunk()),
  };
};
