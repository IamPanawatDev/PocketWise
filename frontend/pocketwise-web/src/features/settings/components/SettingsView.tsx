"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useResetFinancialData, useUpdateUserSettings, useUserSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateUserProfile } from "@/features/settings/hooks/useUpdateProfile";
import { profileSchema, type ProfileFormValues } from "@/schemas/profile.schema";
import { settingsSchema, type SettingsFormValues } from "@/schemas/settings.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { LoaderCircle, Save, Trash2 } from "lucide-react";

export function SettingsView() {
  const queryClient = useQueryClient();
  const settingsQuery = useUserSettings();
  const profileQuery = useCurrentUser();
  const saveSettings = useUpdateUserSettings();
  const saveProfile = useUpdateUserProfile();
  const resetData = useResetFinancialData();
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

  const loading = settingsQuery.isLoading || profileQuery.isLoading;
  const failed = settingsQuery.isError || profileQuery.isError;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-2xl font-bold">ตั้งค่าและโปรไฟล์</h1>
        <p className="text-sm text-[var(--pw-ink)]/65">จัดการค่าตั้งค่าส่วนบุคคลและข้อมูลโปรไฟล์</p>
      </header>

      {loading ? (
        <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดข้อมูล...</p>
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
            <h2 className="mb-4 text-lg font-bold">การตั้งค่าแอป</h2>
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
                  <Input
                    id="settings-currency"
                    maxLength={3}
                    autoCapitalize="characters"
                    {...settingsForm.register("currencyCode", {
                      onChange: (event) => {
                        event.target.value = event.target.value.toUpperCase();
                      },
                    })}
                  />
                </FormField>
                <FormField label="ภาษา / Locale" htmlFor="settings-locale" error={settingsForm.formState.errors.locale?.message}>
                  <Input id="settings-locale" placeholder="th-TH" {...settingsForm.register("locale")} />
                </FormField>
                <div className="flex flex-col justify-end gap-2">
                  <span className="text-sm font-medium">อีเมลแจ้งเตือนงบประมาณ</span>
                  <Controller
                    control={settingsForm.control}
                    name="emailBudgetAlertsEnabled"
                    render={({ field }) => (
                      <Button
                        type="button"
                        variant={field.value ? "success" : "secondary"}
                        aria-pressed={field.value}
                        onClick={() => field.onChange(!field.value)}
                      >
                        {field.value ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </Button>
                    )}
                  />
                  <p className="text-xs text-[var(--pw-ink)]/60">การส่งอีเมลยังไม่เปิดให้ใช้งานในระยะนี้</p>
                </div>
              </div>
              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
                บันทึกการตั้งค่า
              </Button>
            </form>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-bold">ข้อมูลโปรไฟล์</h2>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="ชื่อที่แสดง" htmlFor="profile-display-name" error={profileForm.formState.errors.displayName?.message}>
                  <Input id="profile-display-name" autoComplete="name" {...profileForm.register("displayName")} />
                </FormField>
                <FormField label="อีเมล" htmlFor="profile-email" error={profileForm.formState.errors.email?.message}>
                  <Input id="profile-email" type="email" autoComplete="email" {...profileForm.register("email")} />
                  <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
                    สถานะอีเมล: {profileQuery.data?.isEmailVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                  </p>
                </FormField>
                <FormField label="เบอร์โทรศัพท์ (ไม่บังคับ)" htmlFor="profile-phone" error={profileForm.formState.errors.phoneNumber?.message}>
                  <Input id="profile-phone" type="tel" autoComplete="tel" {...profileForm.register("phoneNumber")} />
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
            <h2 className="mb-2 text-lg font-bold">ล้างข้อมูลการเงิน</h2>
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
