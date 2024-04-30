<script lang="ts">
    import SaveFile from '$lib/components/SaveFile.svelte';
    import SelectCutOptimisation from '$lib/components/SelectCutOptimisation.svelte';
    import { CuttingParser } from '$lib/domain/CuttingParser';
    import ReportBuilder from '$lib/util/ReportBuilder';
    import { createCuttingProcesses } from '$lib/util/createCuttingProcesses';
    import {
        extractCuttingTables,
        type CuttingTable,
        extractPartsQty,
        extractPartsNumbers,
        ExtractionType,
        type CuttingRow,
        extractPositionAndQty,
    } from '$lib/util/extractCuttingTables';
    import { subscribe, store } from '$lib/store';
    import SelectAssemblyList from '$lib/components/SelectAssemblyList.svelte';
    import { message } from '@tauri-apps/api/dialog';
    import type { ExtractedAssemblyListData } from '$lib/types';
    import { getCurrentTime } from '$lib/util/getCurrentTime';

    let _cutOptimisationFile: File | null = $store.cutOptimisationFile;
    let _assemblyListFile: File | null = $store.assemblyListFile;
    let processing = false;

    type ReportData = {
        [key: string]: string[][];
    };

    let reportData: ReportData = {};

    subscribe((val) => {
        _cutOptimisationFile = val.cutOptimisationFile;
        _assemblyListFile = val.assemblyListFile;

        if (
            val.errorMessage &&
            (!val.assemblyListFile || !val.cutOptimisationFile)
        ) {
            // message(val.errorMessage, { title: 'Error!', type: 'error' });
            console.error(val.errorMessage);
        }
    });

    const processAssemblyList = (): ExtractedAssemblyListData | null => {
        try {
            const data = $store.assemblyListData;

            if (!data) {
                processing = false;
                return null;
            }

            const result = extractCuttingTables(
                $store.assemblyListData as {
                    [key: string]: {
                        t: string;
                        v: string;
                        r: string;
                    };
                },
                ExtractionType.ASSEMBLY_LIST
            );

            const partsQty = extractPartsQty(result as CuttingTable);
            const partsNumbers = extractPartsNumbers(result as CuttingTable);
            const positionQty = extractPositionAndQty(result as CuttingTable);

            return {
                partsQty,
                partsNumbers,
                positionQty,
            };
        } catch (error: any) {
            $store.errorMessage = error.message;
            return null;
        }
    };

    const processCuttingList = () => {
        try {
            const data = $store.cutOptimisationData;

            if (!data) {
                message('No file selected', { title: 'Error!', type: 'error' });
                processing = false;
                return;
            }

            const cuttingTables = extractCuttingTables(
                data,
                ExtractionType.CUT_OPTIMISATION
            );

            return cuttingTables;
        } catch (error: any) {
            $store.errorMessage = error.message;
            reportData = {};
        }
    };

    const processFile = async () => {
        try {
            processing = true;

            const cuttingTables = processCuttingList();
            const assemblyListData = processAssemblyList();

            if (!assemblyListData) {
                processing = false;
                return;
            }

            const cuttingParser = new CuttingParser(
                cuttingTables as CuttingRow
            );
            cuttingParser.parse();
            const outputData = cuttingParser.getParsedData();
            const cuttingProcessess = createCuttingProcesses(outputData);
            console.log(cuttingProcessess);
            ReportBuilder.buildReport(cuttingProcessess, assemblyListData);

            const listOfPositions = ReportBuilder.getListOfPositions();

            // wipe clean any previous processing
            reportData = {};

            /**
             * Build the report data
             */

            // Looping for the cutting data
            for (const position of listOfPositions) {
                if (!reportData[position]) reportData[position] = [];

                reportData[position].push(ReportBuilder.columns);

                for (const row of ReportBuilder.reportData) {
                    const partNumbeWithColor = `${row.partNumber}${
                        row.color === 'Sublimare' || row.color === 'NO_COLOR'
                            ? ''
                            : row.color
                    }`;

                    if (row.position === position) {
                        reportData[position].push([
                            partNumbeWithColor,
                            row.length.toString(),
                        ]);
                    }
                }
            }

            for (const position of listOfPositions) {
                for (const accessory of ReportBuilder.accessoriesData) {
                    if (accessory.position === position) {
                        reportData[position].push([
                            accessory.partNumber,
                            accessory.qty.toString(),
                        ]);
                    }
                }
            }

            processing = false;
            reportData = reportData;
            setShowSaveButton(true);
        } catch (error: any) {
            await message(error.message, { title: 'Error!', type: 'error' });
            reportData = {};
            processing = false;
            setShowSaveButton(false);
        }

        processing = false;
    };

    const setShowSaveButton = (show: boolean) => {
        store.update((val) => {
            val.showSaveButton = show;
            return val;
        });
    };
</script>

<div class="flex flex-col justify-center h-screen items-center gap-6">
    <img src="/logo.svg" alt="logo" class="w-48" />
    <p class="font-bold text-xl">Cut Optimisation & Assembly List Aggregator</p>
    <div class="flex flex-row gap-4">
        <SelectCutOptimisation />
        <SelectAssemblyList />
    </div>
    <div class="flex flex-row gap-4">
        <button
            class={`btn ${_cutOptimisationFile && _assemblyListFile ? 'btn-primary' : 'btn-disabled'}`}
            on:click={() => {
                reportData = {};
                processFile();
            }}>Process</button
        >
        {#if processing}
            <div class="loading"></div>
        {/if}
        {#if $store.showSaveButton}
            <SaveFile
                data={reportData ? reportData : {}}
                fileName={`${_cutOptimisationFile?.name.split('.')[0]}_${new Date().toISOString().split('T')[0]}_${getCurrentTime()}_report.xlsx`}
            />
        {/if}
    </div>
</div>

<style>
    .loading {
        border-radius: 50%;
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>
