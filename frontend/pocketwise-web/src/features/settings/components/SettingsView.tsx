"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useSendVerificationEmail } from "@/features/auth/hooks/useEmailVerification";
import { useResetFinancialData, useUpdateUserSettings, useUserSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateUserProfile } from "@/features/settings/hooks/useUpdateProfile";
import { profileSchema, type ProfileFormValues } from "@/schemas/profile.schema";
import { settingsSchema, type SettingsFormValues } from "@/schemas/settings.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { ApiError } from "@/lib/api-client";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Save,
  Settings2,
  Sliders,
  Trash2,
  UserRound,
} from "lucide-react";

export function SettingsView() {
  const queryClient = useQueryClient();
  const settingsQuery = useUserSettings();
  const profileQuery = useCurrentUser();
  const saveSettings = useUpdateUserSettings();
  const saveProfile = useUpdateUserProfile();
  const resetData = useResetFinancialData();
  const sendVerification = useSendVerificationEmail();

  const [verificationCooldown, setVerificationCooldown] = useState(0);

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: "dark",
      currencyCode: "THB",
      locale: "th-TH",
      emailBudgetAlertsEnabled: true,
    },
  });
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: "",
      displayName: "",
      phoneNumber: null,
      birthDate: "",
    },
  });

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = setInterval(() => {
      setVerificationCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationCooldown]);

  useEffect(() => {
    if (!settingsQuery.data) return;
    settingsForm.reset({
      theme: settingsQuery.data.theme,
      currencyCode: settingsQuery.data.currencyCode,
      locale: settingsQuery.data.locale,
      emailBudgetAlertsEnabled: settingsQuery.data.emailBudgetAlertsEnabled,
    });
  }, [settingsQuery.data, settingsForm]);

  useEffect(() => {
    if (!profileQuery.data) return;
    profileForm.reset({
      email: profileQuery.data.email,
      displayName: profileQuery.data.displayName,
      phoneNumber: profileQuery.data.phoneNumber,
      birthDate: profileQuery.data.birthDate ?? "",
    });
  }, [profileQuery.data, profileForm]);

  const onSettingsSubmit = (values: SettingsFormValues) => {
    saveSettings.mutate(values, {
      onSuccess: () => {
        document.documentElement.dataset.theme = values.theme;
        document.documentElement.lang = values.locale;
        toast.success("บันทึกการตั้งค่าแล้ว");
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : "บันทึกการตั้งค่าไม่สำเร็จ"),
    });
  };

  const onProfileSubmit = (values: ProfileFormValues) => {
    const previousEmail = profileQuery.data?.email;
    saveProfile.mutate(
      {
        email: values.email,
        displayName: values.displayName,
        phoneNumber: values.phoneNumber?.trim() || null,
        birthDate: values.birthDate || null,
      },
      {
        onSuccess: async (profile) => {
          await queryClient.invalidateQueries({ queryKey: ["me"] });
          if (previousEmail && previousEmail.toLowerCase() !== profile.email.toLowerCase()) {
            toast.success("บันทึกโปรไฟล์แล้ว อีเมลใหม่ยังไม่ยืนยัน");
          } else {
            toast.success("บันทึกโปรไฟล์แล้ว");
          }
        },
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "บันทึกโปรไฟล์ไม่สำเร็จ"),
      },
    );
  };

  const handleSendVerificationEmail = () => {
    sendVerification.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(data.message || "ส่งลิงก์ยืนยันทางอีเมลเรียบร้อยแล้ว");
        setVerificationCooldown(data.cooldownSeconds || 60);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : "ส่งลิงก์ยืนยันไม่สำเร็จ");
      },
    });
  };

  const loading = settingsQuery.isLoading || profileQuery.isLoading;
  const failed = settingsQuery.isError || profileQuery.isError;
  const isEmailServiceEnabled = settingsQuery.data?.isEmailServiceEnabled ?? true;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          <Settings2 className="size-6 text-[var(--pw-primary)]" />
          ตั้งค่าและโปรไฟล์
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/65">จัดการค่าตั้งค่าส่วนบุคคลและข้อมูลโปรไฟล์</p>
      </header>

      {loading ? (
        <div className="space-y-6">
          <Card className="p-4 sm:p-6 space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-1.5"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <Skeleton className="h-10 w-28" />
          </Card>
          <Card className="p-4 sm:p-6 space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            </div>
            <Skeleton className="h-10 w-28" />
          </Card>
        </div>
      ) : failed ? (
        <p role="alert" className="text-[var(--pw-expense)]">
          {settingsQuery.error instanceof ApiError
            ? settingsQuery.error.message
            : profileQuery.error instanceof ApiError
              ? profileQuery.error.message
              : "โหลดข้อมูลไม่สำเร็จ"}
        </p>
      ) : (
        <>
          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Sliders className="size-5 text-[var(--pw-primary)]" />
              การตั้งค่าแอป
            </h2>
            <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="ธีม" htmlFor="settings-theme" error={settingsForm.formState.errors.theme?.message}>
                  <Controller
                    control={settingsForm.control}
                    name="theme"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="settings-theme"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">สว่าง</SelectItem>
                          <SelectItem value="dark">มืด</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="สกุลเงินหลัก (ISO 4217)" htmlFor="settings-currency" error={settingsForm.formState.errors.currencyCode?.message}>
                  <Controller
                    control={settingsForm.control}
                    name="currencyCode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="settings-currency">
                          <SelectValue placeholder="เลือกสกุลเงิน" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="THB">THB — บาทไทย (฿)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
                    ขณะนี้ระบบเปิดใช้งานเฉพาะสกุลเงินบาทไทย (THB) เท่านั้น
                  </p>
                </FormField>

                <FormField label="ภาษาของระบบ (Language / Locale)" htmlFor="settings-locale" error={settingsForm.formState.errors.locale?.message}>
                  <Controller
                    control={settingsForm.control}
                    name="locale"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="settings-locale">
                          <SelectValue placeholder="เลือกภาษา" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="th-TH">th-TH — ภาษาไทย (ค่าเริ่มต้น)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
                    ขณะนี้ระบบรองรับการแสดงผลภาษาไทยเป็นหลัก
                  </p>
                </FormField>

                <div className="flex flex-col justify-end gap-2">
                  <Controller
                    control={settingsForm.control}
                    name="emailBudgetAlertsEnabled"
                    render={({ field }) => {
                      const isEmailVerified = profileQuery.data?.isEmailVerified ?? false;
                      const isLocked = !isEmailVerified || !isEmailServiceEnabled;

                      const handleCheckboxClick = (e: React.MouseEvent) => {
                        if (!isEmailVerified) {
                          e.preventDefault();
                          toast.error("กรุณายืนยันอีเมลของคุณก่อนเปิดใช้งานการแจ้งเตือนงบประมาณทางอีเมล");
                          field.onChange(false);
                          return;
                        }
                        if (!isEmailServiceEnabled) {
                          e.preventDefault();
                          toast.error("ระบบปิดการให้บริการส่งอีเมลชั่วคราว");
                          field.onChange(false);
                        }
                      };

                      return (
                        <div className="space-y-2 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-3">
                          <div
                            className={cn("flex items-center gap-2", isLocked && "cursor-pointer")}
                            onClick={isLocked ? handleCheckboxClick : undefined}
                          >
                            <Checkbox
                              id="settings-email-alerts"
                              checked={Boolean(field.value && isEmailVerified && isEmailServiceEnabled)}
                              disabled={isLocked}
                              className={cn(isLocked && "pointer-events-none")}
                              onCheckedChange={(checked) => {
                                if (checked && !isEmailVerified) {
                                  toast.error("กรุณายืนยันอีเมลของคุณก่อนเปิดใช้งานการแจ้งเตือนงบประมาณทางอีเมล");
                                  field.onChange(false);
                                  return;
                                }
                                field.onChange(Boolean(checked));
                              }}
                            />
                            <label
                              htmlFor="settings-email-alerts"
                              className={cn(
                                "text-sm font-medium select-none cursor-pointer",
                                isLocked && "text-[var(--pw-ink)]/70",
                              )}
                            >
                              อีเมลแจ้งเตือนงบประมาณ
                            </label>
                            {!isEmailServiceEnabled && (
                              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-500 dark:text-amber-400">
                                ระบบปิดส่งอีเมล
                              </span>
                            )}
                            {!isEmailVerified && (
                              <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-[var(--pw-expense)]">
                                ล็อก (ยังไม่ยืนยันอีเมล)
                              </span>
                            )}
                          </div>

                          {!isEmailVerified ? (
                            <p className="flex items-center gap-1.5 text-xs text-[var(--pw-expense)]">
                              <AlertCircle className="size-3.5 shrink-0" />
                              <span>สถานะอีเมลยังไม่ยืนยัน กรุณายืนยันอีเมลในส่วนข้อมูลโปรไฟล์ก่อน จึงจะสามารถเปิดใช้งานการแจ้งเตือนได้</span>
                            </p>
                          ) : !isEmailServiceEnabled ? (
                            <p className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
                              <AlertCircle className="size-3.5 shrink-0" />
                              <span>ระบบปิดการให้บริการส่งอีเมลไว้ชั่วคราว การแจ้งเตือนจะส่งผ่านระบบ (In-App) เท่านั้น</span>
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--pw-ink)]/60">
                              รับการแจ้งเตือนทางอีเมลเมื่อยอดใช้จ่ายใกล้ถึงขีดจำกัด (80%) หรือเกินงบประมาณ (100%)
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
                บันทึกการตั้งค่า
              </Button>
            </form>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <UserRound className="size-5 text-[var(--pw-primary)]" />
              ข้อมูลโปรไฟล์
            </h2>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="ชื่อที่แสดง" htmlFor="profile-display-name" error={profileForm.formState.errors.displayName?.message}>
                  <Input id="profile-display-name" autoComplete="name" {...profileForm.register("displayName")} />
                </FormField>
                <FormField label="อีเมล" htmlFor="profile-email" error={profileForm.formState.errors.email?.message}>
                  <Input id="profile-email" type="email" autoComplete="email" {...profileForm.register("email")} />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--pw-ink)]/70">สถานะอีเมล:</span>
                      {profileQuery.data?.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> ยืนยันแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <AlertCircle className="size-3" /> ยังไม่ยืนยัน
                        </span>
                      )}
                    </div>

                    {!profileQuery.data?.isEmailVerified && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={sendVerification.isPending || verificationCooldown > 0 || !isEmailServiceEnabled}
                        onClick={handleSendVerificationEmail}
                        className="h-7 text-xs"
                      >
                        {sendVerification.isPending ? (
                          <LoaderCircle className="size-3 animate-spin" />
                        ) : (
                          <Mail className="size-3" />
                        )}
                        {verificationCooldown > 0
                          ? `ส่งอีกครั้งใน (${verificationCooldown}s)`
                          : "ส่งลิงก์ยืนยันอีเมล"}
                      </Button>
                    )}
                  </div>
                  {!isEmailServiceEnabled && !profileQuery.data?.isEmailVerified && (
                    <p className="mt-1 text-xs text-amber-500 dark:text-amber-400">
                      * ระบบปิดการให้บริการส่งอีเมลไว้ชั่วคราว จึงไม่สามารถส่งลิงก์ยืนยันได้
                    </p>
                  )}
                </FormField>
                <FormField label="เบอร์โทรศัพท์ (ไม่บังคับ)" htmlFor="profile-phone" error={profileForm.formState.errors.phoneNumber?.message}>
                  <Controller
                    control={profileForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <Input
                        id="profile-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="0xx-xxx-xxxx"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                      />
                    )}
                  />
                </FormField>
                <FormField label="วันเกิด (ค.ศ.)" htmlFor="profile-birth-date" error={profileForm.formState.errors.birthDate?.message}>
                  <Controller
                    control={profileForm.control}
                    name="birthDate"
                    render={({ field }) => <DateInput id="profile-birth-date" value={field.value} onChange={field.onChange} />}
                  />
                </FormField>
              </div>
              <Button type="submit" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
                บันทึกโปรไฟล์
              </Button>
            </form>
          </Card>

          <Card className="border border-[var(--pw-expense)]/60 p-4 sm:p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-[var(--pw-expense)]">
              <AlertTriangle className="size-5" />
              ล้างข้อมูลการเงิน
            </h2>
            <p className="mb-4 text-sm text-[var(--pw-ink)]/70">
              รายการ ธนาคาร บัตร งบ แผนผ่อน รายการประจำ และใบแจ้งยอดจะถูกซ่อนอย่างถาวรจากการใช้งาน
              พร้อมออกจากระบบทุกอุปกรณ์ ข้อมูลโปรไฟล์ การตั้งค่า หมวดหมู่ แท็ก และประวัติการแจ้งเตือน/นำเข้าจะยังคงอยู่
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={resetData.isPending}>
                  {resetData.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  ล้างข้อมูลการเงิน
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันล้างข้อมูลการเงิน?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การดำเนินการนี้จะ soft-delete ข้อมูลการเงินของคุณและออกจากระบบทุก session
                    ไม่สามารถกู้คืนผ่านแอปได้ ต้องการดำเนินการต่อหรือไม่
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={resetData.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      resetData.mutate(undefined, {
                        onSuccess: () => toast.success("ล้างข้อมูลการเงินแล้ว"),
                        onError: (error) => toast.error(error instanceof ApiError ? error.message : "ล้างข้อมูลไม่สำเร็จ"),
                      });
                    }}
                  >
                    {resetData.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                    ยืนยันล้างข้อมูล
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </>
      )}
    </div>
  );
}
