# Kuran Takip Uygulaması

Modern, responsive ve PWA destekli cüz takip uygulaması.

## Özellikler
- **Google Auth:** Hızlı ve güvenli giriş.
- **Cüz Takibi:** Aktif cüzlerinizi, başlangıç ve hedef bitiş tarihlerine göre takip edin.
- **Dijital Okuyucu:** Uygulama içinden Kur'an sayfalarını okuyun, çevirdiğiniz sayfalar otomatik kaydedilsin.
- **İlerleme Analizi:** Yüzdelik ilerleme ve kalan süreyi görselleştirin.
- **PWA:** Uygulamayı telefonunuza ana ekran (Add to Home Screen) olarak ekleyin.

## Teknolojiler
- React + TypeScript + Vite
- Tailwind CSS
- Firebase (Auth, Firestore)
- Framer Motion (Animasyonlar)
- Lucide React (İkonlar)

## Kurulum

1. Depoyu klonlayın.
2. `npm install` ile bağımlılıkları yükleyin.
3. `.env.example` dosyasını `.env` olarak kopyalayın ve Firebase bilgilerinizi girin.
4. `npm run dev` ile projeyi başlatın.

## Yayınlama
Firebase Hosting kullanarak yayınlamak için:
1. `npm run build`
2. `firebase deploy`
