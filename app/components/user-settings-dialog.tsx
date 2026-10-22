import { useState } from "react";
import { Form } from "react-router";
import { Settings, MapPin, GitBranch, Save, Check, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { UserConfig } from "~/db/schema";

interface UserSettingsDialogProps {
  config: UserConfig | null;
  defaultConfig: {
    gitlabBaseUrl?: string;
    gitlabProjectId?: string;
    gitlabAuthorName?: string;
    officeLatitude?: string;
    officeLongitude?: string;
  };
  autoOpen?: boolean;
}

export function UserSettingsDialog({ config, defaultConfig, autoOpen = false }: UserSettingsDialogProps) {
  const [open, setOpen] = useState(autoOpen);
  const [lat, setLat] = useState(config?.officeLatitude?.toString() || defaultConfig.officeLatitude || "-7.565374884700425");
  const [lng, setLng] = useState(config?.officeLongitude?.toString() || defaultConfig.officeLongitude || "110.81394969592333");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolokasi.");
      return;
    }
    setGettingLocation(true);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(14));
        setLng(pos.coords.longitude.toFixed(14));
        setGettingLocation(false);
        setLocationSuccess(true);
        setTimeout(() => setLocationSuccess(false), 3000);
      },
      (err) => {
        alert(`Gagal mengambil koordinat: ${err.message}`);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            title="Pengaturan Repository & Lokasi"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Pengaturan</span>
          </Button>
        }
      />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary/10 text-primary border border-primary/20">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold tracking-tight">
                Pengaturan Pengguna
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kustomisasi koneksi GitLab dan koordinat presensi MagangHub Anda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {autoOpen && (
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            <span className="font-semibold block mb-0.5">Selamat Datang</span>
            <span className="text-[11px] leading-relaxed opacity-90">
              Silakan lengkapi Project ID dan Personal Access Token GitLab Anda terlebih dahulu untuk mulai memuat commit dan membuat laporan harian.
            </span>
          </div>
        )}

        <Form method="post" onSubmit={() => setOpen(false)} className="space-y-4 py-2">
          <input type="hidden" name="intent" value="save_config" />

          {/* Section 1: GitLab */}
          <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              <span>Konfigurasi GitLab</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">GitLab Base URL</Label>
              <Input
                name="gitlabBaseUrl"
                defaultValue={config?.gitlabBaseUrl || defaultConfig.gitlabBaseUrl || "https://gitlab.perpuskita.id"}
                placeholder="https://gitlab.example.com"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Project ID</Label>
                <Input
                  name="gitlabProjectId"
                  defaultValue={config?.gitlabProjectId || defaultConfig.gitlabProjectId || ""}
                  placeholder="80"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Author Filter</Label>
                <Input
                  name="gitlabAuthorName"
                  defaultValue={config?.gitlabAuthorName || defaultConfig.gitlabAuthorName || ""}
                  placeholder="bikraabn1"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">
                Personal Access Token (Opsional, timpa default .env)
              </Label>
              <Input
                name="gitlabToken"
                type="password"
                defaultValue={config?.gitlabToken || ""}
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Section 2: GPS Location */}
          <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Koordinat Kantor Presensi</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="h-6 text-[10px] gap-1 px-2 cursor-pointer font-medium"
              >
                {gettingLocation ? (
                  <>
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    <span>Mencari GPS...</span>
                  </>
                ) : locationSuccess ? (
                  <>
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                    <span>GPS Terisi</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-2.5 w-2.5" />
                    <span>Gunakan GPS Sekarang</span>
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Latitude</Label>
                <Input
                  name="officeLatitude"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Longitude</Label>
                <Input
                  name="officeLongitude"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs cursor-pointer">
                  Batal
                </Button>
              }
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Simpan Pengaturan</span>
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
