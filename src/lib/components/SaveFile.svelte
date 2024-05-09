<script lang="ts">
    import { resetStoreValues } from '$lib/store';
    import { getCurrentTime } from '$lib/util/getCurrentTime';
    import {  } from 'svelte';
    import * as XLSX from 'xlsx';

    export let data: {
        [key: string]: string[][];
    };
    export let fileName: string = `Raport-simplificat-${new Date().toISOString().split('T')[0]}_${getCurrentTime()}.xlsx`;

    const s2ab = (s: string) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    };

    const saveFile = () => {
        const wb = XLSX.utils.book_new();
        const keys = Object.keys(data);

        for (const position of keys) {
            const ws = XLSX.utils.aoa_to_sheet(data[position]);
            XLSX.utils.book_append_sheet(wb, ws, position);
        }

        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        const blob = new Blob([s2ab(wbOut)], {
            type: 'application/octet-stream',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resetStoreValues();
        data = {};
    };
</script>

{#if Object.keys(data).length > 0}
    <button class="btn btn-primary" on:click={saveFile}>Save Report</button>
{/if}
