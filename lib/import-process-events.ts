type DrawerListener = () => void;

let isImportProcessDrawerOpen = false;
const listeners = new Set<DrawerListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function getImportProcessDrawerOpen() {
  return isImportProcessDrawerOpen;
}

export function subscribeImportProcessDrawer(listener: DrawerListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setImportProcessDrawerOpen(open: boolean) {
  if (isImportProcessDrawerOpen === open) {
    return;
  }
  isImportProcessDrawerOpen = open;
  notifyListeners();
}

export function openImportProcessDrawer() {
  setImportProcessDrawerOpen(true);
}

export function toggleImportProcessDrawer() {
  setImportProcessDrawerOpen(!isImportProcessDrawerOpen);
}
