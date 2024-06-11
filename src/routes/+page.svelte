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
    import type { ExtractedAssemblyListData } from '$lib/types';
    import { message, ask } from '@tauri-apps/api/dialog';
    import { getVersion } from '@tauri-apps/api/app';
    import {
        checkUpdate as check,
        installUpdate,
    } from '@tauri-apps/api/updater';
    import { relaunch } from '@tauri-apps/api/process';
    import { onMount } from 'svelte';

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

        if (val.errorMessage) {
            message(val.errorMessage, { title: 'Error!', type: 'error' });
            store.update((val) => {
                val.errorMessage = '';
                return val;
            });
        }
    });

    async function checkForAppUpdates(onUserClick: boolean = false) {
        try {
            const update = await check();
            if (update === null) {
                await message(
                    'Failed to check for updates.\nPlease try again later.',
                    {
                        title: 'Error',
                        type: 'error',
                        okLabel: 'OK',
                    }
                );
                return;
            } else if (update?.shouldUpdate) {
                const yes = await ask(
                    `Update to ${update.manifest?.version} is available!\n\nRelease notes: ${update.manifest?.body}`,
                    {
                        title: 'Update Available',
                        type: 'info',
                        okLabel: 'Update',
                        cancelLabel: 'Cancel',
                    }
                );
                if (yes) {
                    await installUpdate();
                    // Restart the app after the update is installed by calling the Tauri command that handles restart for your app
                    // It is good practice to shut down any background processes gracefully before restarting
                    // As an alternative, you could ask the user to restart the app manually
                    await relaunch();
                }
            } else if (onUserClick) {
                await message('You are on the latest version. Stay awesome!', {
                    title: 'No Update Available',
                    type: 'info',
                    okLabel: 'OK',
                });
            }
        } catch (error: any) {
            store.update((val) => {
                return {
                    ...val,
                    errorMessage: error.message,
                };
            });
        }
    }

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
            store.update((val) => {
                val.errorMessage = error.message;
                val.showSaveButton = false;
                return val;
            });
            return null;
        }
    };

    const processCuttingList = () => {
        try {
            const data = $store.cutOptimisationData;

            if (!data) {
                store.update((val) => {
                    val.errorMessage = 'No file selected';
                    val.showSaveButton = false;
                    return val;
                });
                processing = false;
                return;
            }

            const cuttingTables = extractCuttingTables(
                data,
                ExtractionType.CUT_OPTIMISATION
            );

            return cuttingTables;
        } catch (error: any) {
            store.update((val) => {
                val.errorMessage = error.message;
                val.showSaveButton = false;
                return val;
            });
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
                    const partNumbeWithColor = `${row.partNumber}${row.color === 'NO_COLOR' ? '' : row.color}`;

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
            setShowSaveButton(true);
        } catch (error: any) {
            store.update((val) => {
                val.errorMessage = error.message;
                val.showSaveButton = false;
                return val;
            });
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

    onMount(() => {
        checkForAppUpdates();
    });
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
            }}>Process File</button
        >
        {#if processing}
            <div class="loading"></div>
        {/if}
        {#if $store.showSaveButton}
            <SaveFile
                data={reportData ? reportData : {}}
                fileName={`Raport ${$store.projectName}_${$store.projectDate}.xlsx`}
            />
        {/if}
    </div>
    <div>
        {#await getVersion() then version}
            <p class="text-xs">Version: {version}</p>
        {:catch error}
            <p class="text-xs">Version: Unknown</p>
        {/await}
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
