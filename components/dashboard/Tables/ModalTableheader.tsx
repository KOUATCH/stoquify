"use client";

import { notify } from "@/lib/notifications/notify"
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { readSpreadsheet, SpreadsheetImportError } from "@/lib/imports/read-spreadsheet";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import exportDataToExcel from "@/lib/exportDataToExcel";
import { formatBytes } from "@/lib/formatBytes";
import { generateSlug } from "@/lib/generateSlug";
import { Check, CloudUpload, Loader2, X } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { FaFileExcel } from "react-icons/fa";
import { RiFileExcel2Line } from "react-icons/ri";

type TableHeaderProps = {
  title: string;
  href: string;
  linkTitle: string;
  data: any;
  model: string;
  modalForm: ReactNode,
  showImport?: boolean;
};
export default function ModalTableHeader({
  title,
  href,
  linkTitle,
  data,
  model,
  modalForm,
  showImport = true,
}: TableHeaderProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState("");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  let excelDownload = "#";
  if (model === "category") {
    excelDownload = "/Categories.xlsx";
  } else if (model === "brand") {
    excelDownload = "/Brands.xlsx";
  } else if (model === "warehouse") {
    excelDownload = "/Warehouses.xlsx";
  } else if (model === "supplier") {
    excelDownload = "/Suppliers.xlsx";
  } else if (model === "unit") {
    excelDownload = "/Units.xlsx";
  } else if (model === "product") {
    excelDownload = "/Products.xlsx";
  }
  console.log(excelFile);

  function selectExcelFile(file: File | null) {
    setExcelFile(file);
    setJsonData("");
    setPreview(false);
    setUploadSuccess(false);
  }

  async function previewData() {
    if (!excelFile || loading) return;
    setLoading(true);
    setPreview(false);
    setJsonData("");
    setUploadSuccess(false);
    try {
      const json = await readSpreadsheet(excelFile);
      setJsonData(JSON.stringify(json, null, 2));
      setPreview(true);
    } catch (error) {
      notify.error(error instanceof SpreadsheetImportError ? error.message : "The spreadsheet could not be read.");
    } finally {
      setLoading(false);
    }
  }

  async function saveData() {
    if (!excelFile || loading) return;
    setLoading(true);
    setPreview(false);
    setJsonData("");
    setUploadSuccess(false);
    try {
      const json = await readSpreadsheet(excelFile);
      setJsonData(JSON.stringify(json, null, 2));
      if (model === "category") {
        const categories = json.map((item: any) => {
          return {
            title: item.Title,
            slug: generateSlug(item.Title),
            description: item.Description,
            imageUrl: item.Image,
            mainCategoryId: item.mainCategoryId,
            status: true,
          };
        });
        // await createBulkCategories(categories);
      }
      setUploadSuccess(true);
    } catch (error) {
      notify.error(error instanceof SpreadsheetImportError ? error.message : "The import could not be completed. Check the result before retrying.");
    } finally {
      setLoading(false);
    }
  }
  function handleExportData() {
    console.log("data exported");
    const today = new Date();
    const filename = `Exported ${title} ${today.toDateString()}`;
    // console.log(filename);
    exportDataToExcel(data, filename);
  }
  return (
    <div className=" mb-1">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 py-3">
        <h2 className="scroll-m-20  text-2xl font-semibold tracking-tight first:mt-0">
          {title}({data.length})
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleExportData}
            size="sm"
            variant="outline"
            className="h-8 gap-1"
          >
            <FaFileExcel className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>

          {showImport && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setUploadSuccess(false)}
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                >
                  <RiFileExcel2Line className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Import
                  </span>
                </Button>
              </DialogTrigger>
              {loading ? (
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Excel Upload</DialogTitle>
                    <DialogDescription className="text-xs">
                      You can Bring all your Data from excel, Please Download
                      the Sample file First to Make Sure you have Data Columns
                      Named Correctly
                    </DialogDescription>
                  </DialogHeader>
                  <div className="h-60 w-full rounded-md border flex items-center justify-center">
                    <Button disabled className="items-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing spreadsheet. Please wait ...
                    </Button>
                  </div>
                  {!loading && (
                    <DialogFooter className="justify-between ">
                      {preview ? (
                        <Button
                          onClick={() => setPreview(false)}
                          variant={"outline"}
                          type="button"
                        >
                          Stop Preview
                        </Button>
                      ) : (
                        <Button
                          disabled={loading} onClick={previewData}
                          variant={"outline"}
                          type="button"
                        >
                          Preview
                        </Button>
                      )}
                      <Button disabled={loading} onClick={saveData} type="button">
                        Save Data
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              ) : (
                <>
                  {uploadSuccess ? (
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Excel Upload</DialogTitle>
                        <DialogDescription className="text-xs">
                          You can Bring all your Data from excel, Please
                          Download the Sample file First to Make Sure you have
                          Data Columns Required
                        </DialogDescription>
                      </DialogHeader>
                      <div className="h-72 w-full rounded-md border flex items-center justify-center flex-col">
                        <div className="flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
                          <Check />
                        </div>
                        <h2 className="text-xs pt-2 px-8 text-center">
                          Data Synced Successfully. You can close the Window
                        </h2>
                      </div>

                      <DialogFooter className="justify-between ">
                        <DialogClose asChild>
                          <Button
                            onClick={() => window.location.reload()}
                            type="button"
                            variant="secondary"
                          >
                            Close
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  ) : (
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Excel Upload</DialogTitle>
                        <DialogDescription className="text-xs">
                          You can Bring all your Data from excel, Please
                          Download the Sample file First to Make Sure you have
                          Data Columns Required
                        </DialogDescription>
                      </DialogHeader>
                      {preview && jsonData ? (
                        <ScrollArea className="h-72 w-full rounded-md border">
                          <div className="p-4">
                            <pre>{jsonData}</pre>
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="grid gap-4 py-4">
                          <Button asChild variant="outline">
                            <Link href={excelDownload} download>
                              Download {model} Import Template
                            </Link>
                          </Button>

                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="dropzone-file"
                              className="flex lg:flex-col flex-row  items-center justify-center w-full h-16 lg:h-36 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
                            >
                              <div className="flex flex-row lg:flex-col items-center justify-center pt-5 pb-6 gap-4 lg:gap-0">
                                <CloudUpload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />

                                <p className="lg:mb-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold">
                                    Click to upload
                                  </span>{" "}
                                  <span className="hidden lg:inline">
                                    {" "}
                                    or drag and drop
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Only Excel Files (.xlsx)
                                </p>
                              </div>
                              <input
                                id="dropzone-file"
                                accept=".xls,.xlsx"
                                disabled={loading}
                                type="file"
                                className="hidden"
                                onChange={(e) =>
                                  selectExcelFile(
                                    e.target.files ? e.target.files[0] : null
                                  )
                                }
                              />
                            </label>
                          </div>
                          {excelFile && (
                            <div className="flex items-center shadow-lg rounded-md lg:py-3 py-2 px-6 bg-slate-100 dark:bg-slate-800 justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 lg:w-14 lg:h-14 p-2 lg:p-4 bg-slate-300 dark:bg-slate-500 rounded flex items-center justify-center flex-shrink-0">
                                  <RiFileExcel2Line className="h-4 w-4" />
                                </div>
                                <div className="">
                                  <p className="text-sm font-semibold">
                                    {excelFile.name}
                                  </p>
                                  <span className="text-xs">
                                    {formatBytes(excelFile.size)}
                                  </span>
                                </div>
                              </div>
                              <button disabled={loading} onClick={() => selectExcelFile(null)}>
                                <X className="text-slate-600 w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <DialogFooter className="justify-between ">
                        {preview ? (
                          <Button
                            onClick={() => setPreview(false)}
                            variant={"outline"}
                            type="button"
                          >
                            Stop Preview
                          </Button>
                        ) : (
                          <Button
                            disabled={loading} onClick={previewData}
                            variant={"outline"}
                            type="button"
                          >
                            Preview
                          </Button>
                        )}
                        <Button disabled={loading} onClick={saveData} type="button">
                          Save Data
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  )}
                </>
              )}
            </Dialog>
          )}
          {modalForm}
        </div>
      </div>
    </div>
  );
}
