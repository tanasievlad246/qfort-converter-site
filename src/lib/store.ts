import { writable } from 'svelte/store';
import * as XLSX from 'xlsx';

type WorkSheetObject =
    | XLSX.WorkSheet
    | {
          [key: string]: {
              t: string;
              v: string;
              r: string;
          };
      };

interface FileStore {
    projectName: string,
    projectDate: string,
    cutOptimisationFile: File | null;
    cutOptimisationData: WorkSheetObject | null;
    assemblyListFile: File | null;
    assemblyListData: WorkSheetObject | null;
    resultData: string | null;
    errorMessage: string | null;
    showSaveButton: boolean;
}

const store = writable<FileStore>({
    projectName: '',
    projectDate: '',
    cutOptimisationFile: null,
    cutOptimisationData: null,
    assemblyListFile: null,
    assemblyListData: null,
    resultData: null,
    errorMessage: null,
    showSaveButton: false,
});

const resetStoreValues = () => {
    store.update((store) => {
        store.projectDate = '',
        store.projectName = '',
        store.cutOptimisationFile = null;
        store.cutOptimisationData = null;
        store.assemblyListFile = null;
        store.assemblyListData = null;
        store.resultData = null;
        store.errorMessage = null;
        store.showSaveButton = false;
        return store;
    });
};

const { set, update, subscribe } = store;

export { store, set, update, subscribe, resetStoreValues };
