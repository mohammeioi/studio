# Firebase Studio

هذا مشروع NextJS مبدئي في Firebase Studio.

للبدء، ألقِ نظرة على الملف `src/app/page.tsx`.

## المتطلبات الأساسية (Prerequisites)

قبل أن تبدأ، يجب أن يكون لديك **Node.js** (إصدار 18 أو أحدث) و **npm** مثبتين على نظامك. هذه الأدوات ضرورية لتشغيل المشروع.

### الطريقة الموصى بها: التثبيت باستخدام nvm (Linux & macOS)

الطريقة الموصى بها لتثبيت Node.js و npm هي باستخدام **nvm (Node Version Manager)**. يتيح لك هذا البرنامج إدارة إصدارات متعددة من Node.js دون مشاكل في الصلاحيات.

1.  **افتح الطرفية (terminal)** وقم بتشغيل الأمر التالي لتثبيت nvm:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
2.  **أغلق الطرفية وأعد فتحها** لتفعيل التغييرات.
3.  **ثبّت Node.js** (هذا الأمر سيقوم بتثبيت آخر إصدار طويل الأمد، وهو الموصى به):
    ```bash
    nvm install --lts
    ```
4.  **تحقق من التثبيت** عن طريق فحص الإصدارات:
    ```bash
    node -v
    npm -v
    ```
    يجب أن ترى أرقام الإصدارات تظهر لكلا الأمرين.

## التثبيت والإعداد

بمجرد تثبيت المتطلبات الأساسية، اتبع الخطوات التالية. هذه الأوامر تعمل على جميع أنظمة التشغيل (Linux, macOS, Windows).

1.  **اذهب إلى مجلد المشروع** في الطرفية الخاصة بك:
    ```bash
    cd path/to/your/project
    ```
2.  **ثبّت اعتماديات المشروع**:
    ```bash
    npm install
    ```
3.  **شغّل خادم التطوير**:
    ```bash
    npm run dev
    ```
    سيكون التطبيق متاحًا على العنوان `http://localhost:9002`.

### تعليمات خاصة بنظام Windows

إذا كنت تستخدم نظام Windows وواجهت أخطاء أثناء تنفيذ `npm install`، فقد يكون ذلك بسبب ميزة أمان افتراضية. لحل هذه المشكلة، اتبع الخطوات التالية:

1.  افتح **PowerShell كمسؤول (administrator)**.
2.  الصق الأمر التالي واضغط **Enter**:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
3.  عندما يُطلب منك، اكتب **Y** ثم اضغط **Enter**.

بعد ذلك، يمكنك تشغيل `npm install` و `npm run dev` من قسم "التثبيت والإعداد".
