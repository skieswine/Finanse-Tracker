import type { Locale } from "@/lib/i18n/types";

type Section = { heading: string; body: string[] };
type PrivacyContent = { title: string; updated: string; intro: string; sections: Section[]; back: string };

const CONTACT = "ostap.konstant1nov.uk@gmail.com";

/** Long-form legal text lives here, not in the UI dictionaries. */
export const PRIVACY: Record<Locale, PrivacyContent> = {
  uk: {
    title: "Політика конфіденційності",
    updated: "Оновлено 16.10.2026",
    intro: "Finly — особистий застосунок для обліку фінансів, доступний лише за запрошенням. Тут описано, які дані він зберігає і як.",
    sections: [
      {
        heading: "Які дані зберігаються",
        body: [
          "Ваш email (і, якщо ви входите через Google, ім'я та фото профілю Google) — лише для входу.",
          "Дані, які ви самі вносите: транзакції, рахунки, категорії, бюджети, цілі, борги, правила.",
        ],
      },
      {
        heading: "Виписки та скріншоти",
        body: [
          "Файли виписок (CSV, PDF, DOCX, зображення) обробляються лише у вашому браузері. Самі файли ніколи не завантажуються на сервер і не зберігаються — зберігаються тільки транзакції, які ви підтвердили.",
        ],
      },
      {
        heading: "Де зберігаються дані",
        body: [
          "У базі Supabase (ЄС, Франкфурт); сайт працює на Vercel. Доступ до ваших даних має лише ваш акаунт (row-level security).",
          "Для курсів валют застосунок запитує публічні курси НБУ та ЄЦБ — без жодних ваших даних.",
        ],
      },
      {
        heading: "Чого ми не робимо",
        body: ["Не продаємо і не передаємо дані третім особам, не показуємо рекламу, не використовуємо аналітику чи трекери."],
      },
      {
        heading: "Видалення",
        body: ["У розділі «Акаунт» можна будь-коли видалити акаунт — усі ваші дані буде видалено назавжди."],
      },
      { heading: "Контакт", body: [CONTACT] },
    ],
    back: "На головну",
  },
  en: {
    title: "Privacy policy",
    updated: "Updated 2026-10-16",
    intro: "Finly is an invite-only personal finance app. This page explains what data it stores and how.",
    sections: [
      {
        heading: "What is stored",
        body: [
          "Your email (and, if you sign in with Google, your Google name and profile picture) — only to sign you in.",
          "Data you enter yourself: transactions, accounts, categories, budgets, goals, debts, rules.",
        ],
      },
      {
        heading: "Statements and screenshots",
        body: [
          "Statement files (CSV, PDF, DOCX, images) are processed only in your browser. The files themselves are never uploaded or stored — only the transactions you confirm are saved.",
        ],
      },
      {
        heading: "Where data lives",
        body: [
          "In a Supabase database (EU, Frankfurt); the site runs on Vercel. Only your own account can access your data (row-level security).",
          "For exchange rates the app requests public NBU and ECB rates — without any of your data.",
        ],
      },
      {
        heading: "What we don't do",
        body: ["No selling or sharing of data with third parties, no ads, no analytics or trackers."],
      },
      {
        heading: "Deletion",
        body: ["You can delete your account at any time under “Account” — all your data is permanently removed."],
      },
      { heading: "Contact", body: [CONTACT] },
    ],
    back: "Home",
  },
  de: {
    title: "Datenschutzerklärung",
    updated: "Stand: 16.10.2026",
    intro: "Finly ist eine private Finanz-App, nur auf Einladung. Hier steht, welche Daten gespeichert werden und wie.",
    sections: [
      {
        heading: "Welche Daten gespeichert werden",
        body: [
          "Deine E-Mail-Adresse (und bei Google-Anmeldung Name und Profilbild aus Google) — nur für die Anmeldung.",
          "Daten, die du selbst eingibst: Buchungen, Konten, Kategorien, Budgets, Ziele, Schulden, Regeln.",
        ],
      },
      {
        heading: "Kontoauszüge und Screenshots",
        body: [
          "Dateien (CSV, PDF, DOCX, Bilder) werden ausschließlich in deinem Browser verarbeitet. Die Dateien selbst werden nie hochgeladen oder gespeichert — gespeichert werden nur die Buchungen, die du bestätigst.",
        ],
      },
      {
        heading: "Wo die Daten liegen",
        body: [
          "In einer Supabase-Datenbank (EU, Frankfurt); die Website läuft auf Vercel. Nur dein eigenes Konto hat Zugriff auf deine Daten (Row-Level-Security).",
          "Für Wechselkurse ruft die App öffentliche Kurse von NBU und EZB ab — ohne deine Daten.",
        ],
      },
      {
        heading: "Was wir nicht tun",
        body: ["Kein Verkauf oder Weitergabe an Dritte, keine Werbung, keine Analyse- oder Tracking-Tools."],
      },
      {
        heading: "Löschung",
        body: ["Unter „Konto“ kannst du dein Konto jederzeit löschen — alle deine Daten werden endgültig entfernt."],
      },
      { heading: "Kontakt", body: [CONTACT] },
    ],
    back: "Zur Startseite",
  },
  ru: {
    title: "Политика конфиденциальности",
    updated: "Обновлено 16.10.2026",
    intro: "Finly — личное приложение для учёта финансов, доступное только по приглашению. Здесь описано, какие данные оно хранит и как.",
    sections: [
      {
        heading: "Какие данные хранятся",
        body: [
          "Ваш email (и, если вы входите через Google, имя и фото профиля Google) — только для входа.",
          "Данные, которые вы вводите сами: транзакции, счета, категории, бюджеты, цели, долги, правила.",
        ],
      },
      {
        heading: "Выписки и скриншоты",
        body: [
          "Файлы выписок (CSV, PDF, DOCX, изображения) обрабатываются только в вашем браузере. Сами файлы никогда не загружаются на сервер и не хранятся — сохраняются только подтверждённые вами транзакции.",
        ],
      },
      {
        heading: "Где хранятся данные",
        body: [
          "В базе Supabase (ЕС, Франкфурт); сайт работает на Vercel. Доступ к вашим данным есть только у вашего аккаунта (row-level security).",
          "Для курсов валют приложение запрашивает публичные курсы НБУ и ЕЦБ — без каких-либо ваших данных.",
        ],
      },
      {
        heading: "Чего мы не делаем",
        body: ["Не продаём и не передаём данные третьим лицам, не показываем рекламу, не используем аналитику или трекеры."],
      },
      {
        heading: "Удаление",
        body: ["В разделе «Аккаунт» можно в любой момент удалить аккаунт — все ваши данные будут удалены навсегда."],
      },
      { heading: "Контакт", body: [CONTACT] },
    ],
    back: "На главную",
  },
};
