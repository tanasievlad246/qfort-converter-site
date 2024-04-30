<script lang="ts">
    import { SHEET_NAME } from '$lib/util/consts';
    import * as XLSX from 'xlsx';
    import { store } from '$lib/store';
    import { checkFileUploadType } from '$lib/util/checkFileUpload';

    let file: File | null = null;
    let data: XLSX.WorkSheet = {};
    let fileInput: HTMLInputElement | null = null;

    store.subscribe((val) => {
        file = val.assemblyListFile;
    });

    function handleFileUpload(event: Event) {
        const target = event.target as HTMLInputElement;

        if (!target.files) {
            store.update(
                (val) =>
                    (val = {
                        ...val,
                        errorMessage: (val.errorMessage = 'No file selected'),
                        showSaveButton: false,
                    })
            );
            return;
        }

        const _file = target.files[0];

        if (!_file) {
            store.update(
                (val) =>
                    (val = {
                        ...val,
                        errorMessage: (val.errorMessage = 'No file selected'),
                        showSaveButton: false,
                    })
            );
            return;
        }

        file = _file;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target) {
                store.update(
                    (val) =>
                        (val = {
                            ...val,
                            errorMessage: (val.errorMessage =
                                'No file selected'),
                            showSaveButton: false,
                        })
                );
                return;
            }
            const ab = e.target.result;
            const workbook = XLSX.read(ab);
            const worksheet = workbook.Sheets[SHEET_NAME];
            data = worksheet;

            const isAssemblyList = checkFileUploadType(data, 'AssemblyList');

            if (isAssemblyList) {
                store.update((state) => {
                    return {
                        ...state,
                        assemblyListFile: _file,
                        assemblyListData: data,
                        errorMessage: (state.errorMessage = ''),
                    };
                });
            } else {
                store.update(
                    (val) =>
                        (val = {
                            ...val,
                            assemblyListData: null,
                            assemblyListFile: null,
                            errorMessage: (val.errorMessage =
                                'Invalid file type. Please select an Assembly List file.'),
                            showSaveButton: false,
                        })
                );
            }
        };
        reader.readAsArrayBuffer(_file);
        clearFileInput();
    }

    function clearFileInput() {
        if (fileInput) {
            fileInput.value = ''; // Clear the input after processing
        }
    }
</script>

<div class="flex flex-col gap-4">
    <input
        type="file"
        accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        on:change={handleFileUpload}
        hidden={true}
        bind:this={fileInput}
    />
    <button class="btn btn-primary" on:click={() => fileInput?.click()}
        >Select Assembly List File</button
    >
    <p class="text-wrap">{file ? file.name : ''}</p>
</div>
