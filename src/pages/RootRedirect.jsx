import React from 'react';
import { Navigate } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { DEFAULT_LIST_ID, loadLastListId } from '../services/storageService';

/** Route: / — send the user to the last list they used (or the default list). */
export default function RootRedirect() {
  const { getList } = useLists();
  const last = loadLastListId();
  const target = last && getList(last) ? last : DEFAULT_LIST_ID;
  return <Navigate to={`/lists/${target}`} replace />;
}
