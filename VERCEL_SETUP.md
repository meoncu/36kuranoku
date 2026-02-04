# Vercel Deployment Setup

Vercel'deki "boş ekran" sorunu genellikle **Environment Variables (Ortam Değişkenleri)** eksikliğinden kaynaklanır. Projenizde Firebase kullandığınız için, Firebase yapılandırma anahtarlarını Vercel'e eklemeniz gerekir.

## Adım Adım Çözüm

1.  **Vercel Dashboard**'a gidin ve projenizi (`36kuranoku`) seçin.
2.  Üst menüden **Settings** (Ayarlar) sekmesine tıklayın.
3.  Sol menüden **Environment Variables** seçeneğine tıklayın.
4.  Bilgisayarınızdaki `.env` dosyasını açın.
5.  Aşağıdaki her bir değişkeni Vercel'e ekleyin (Key ve Value olarak):

| Key (Anahtar) | Value (Değer) - .env dosyanızdan kopyalayın |
|---|---|
| `VITE_FIREBASE_API_KEY` | ... |
| `VITE_FIREBASE_AUTH_DOMAIN` | ... |
| `VITE_FIREBASE_PROJECT_ID` | ... |
| `VITE_FIREBASE_STORAGE_BUCKET` | ... |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ... |
| `VITE_FIREBASE_APP_ID` | ... |

6.  Tüm değişkenleri ekledikten sonra **Deployments** sekmesine gidin.
7.  Son dağıtımın yanındaki **...** (üç nokta) menüsüne tıklayın ve **Redeploy** (Yeniden Dağıt) seçeneğini seçin. `Redeploy` yapmazsanız değişkenler aktif olmaz.

## Hata Kontrolü (Opsiyonel)

Eğer sorun devam ederse:
1.  Vercel'deki sitenizi açın.
2.  Sayfada sağ tıklayıp "İncele" (Inspect) deyin.
3.  **Console** sekmesine bakın. Kırmızı renkli hatalar sorunun nedenini tam olarak söyleyecektir.
