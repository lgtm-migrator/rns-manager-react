import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import tabReducers from './tabs';
import authReducer from './auth';
import notificationReducer from './notifications';
import multilanguage from './multilanguageReducer';

const rootReducer = history => combineReducers({
  ...tabReducers,
  auth: authReducer,
  notifications: notificationReducer,
  router: connectRouter(history),
  multilanguage,
});

export default rootReducer;
