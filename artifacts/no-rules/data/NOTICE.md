# Источники и лицензии снимка мира NO RULES

- **GeoNames**: https://www.geonames.org/ — `countryInfo.txt`, `admin1CodesASCII.txt`, `cities500.zip` из https://download.geonames.org/export/dump/. CC BY 4.0: https://creativecommons.org/licenses/by/4.0/. В снимке отобраны связанные записи населённых пунктов: крупнейшие и малые в административных регионах, а не полный мировой реестр поселений. Административные коды и GeoNames ID сохранены. Размер поселения вычисляется из указанного населения, а не объявляется официальным статусом города или деревни.
- **world-countries 5.1.0**, mledoze и участники: https://github.com/mledoze/countries. ODbL 1.0; полный текст в `LICENSE-world-countries.txt`. Русские названия стран, ISO-коды, признаки членства. Исправлена ошибка источника: Ватикан/Святой Престол — наблюдатель, не член ООН: https://www.un.org/en/about-us/non-member-states. Итог — ровно 193 государства-члена. Производная географическая база `world.json` распространяется под ODbL 1.0 с сохранением атрибуции GeoNames для его содержимого; это не меняет лицензию программного кода приложения.
- **@faker-js/faker 10.1.0**: https://github.com/faker-js/faker. MIT, `LICENSE-faker.txt`. Извлечены собственные мужские/женские списки имён и фамилий локалей. Собственные страновые наборы не содержат неявного fallback; новый явно помеченный резерв описан ниже.
- **Python Faker 37.12.0**: https://github.com/joke2k/faker. MIT, `LICENSE-python-faker.txt`. Используются собственные данные person-провайдеров, включая региональные языки Индии, Нигерии, Канады, Ирландии и дополнительные страны. Исландские патронимы строятся по исходным засвидетельствованным формам, не наследуют фамилию отца как обычную семейную фамилию.
- **Mimesis 18.0.0**: https://github.com/lk-geimfari/mimesis. MIT, `LICENSE-mimesis.txt`. Казахские мужские/женские имена и фамилии; отдельные арабские локали.
- **Wikidata**: https://www.wikidata.org/, CC0: https://www.wikidata.org/wiki/Wikidata:Licensing. `russian-names.json` содержит однозначные точные соответствия исходной языковой метки и русского написания; Q-ID каждой записи сохранены. Это неполный словарь, не универсальная фонетическая транслитерация. Неоднозначные и отсутствующие формы не угадываются. При отсутствии полной русской формы имя целиком сохраняется в исходной записи. В импорте 30 пакетов запроса были недоступны; они не считаются проверенными данными.

`name-pools.json` — производные MIT-данные Faker/Mimesis с атрибуцией; `russian-names.json` — CC0-данные Wikidata. Снимок проверен 2026-11-02. Версии пакетов, SHA-256 входных файлов и сведения о частичном ответе Wikidata записаны в `manifest.json`.

Наборы Faker/Mimesis предназначены для тестовых данных, не являются демографическими реестрами. Наличие набора не означает полного охвата всех культур страны. Привязки к странам и известным языковым регионам заданы явно; контексты выбираются без выдуманных демографических долей. Проверенные данные о конкретных региональных группах есть не для каждой страны. Имена не используются как определитель этнической принадлежности.

Полные собственные наборы с полом доступны не для всех стран. Поиск продолжается по языковой группе CLDR и затем по явно помеченному резерву; это не выдаётся за подтверждённое местное имя. GeoNames не всегда содержит первый административный регион (в том числе у малых государств); пропуск отмечается явно. Антарктида, остров Буве, острова Херд и Макдональд и малые отдалённые острова США включены в метаданные, но не выбираются для рождения: в этом источнике нет подходящих поселений. Все 193 государства ООН выбираются.

Полный перечень стран, территорий, числа поселений и наличия наборов имён: [COVERAGE.md](COVERAGE.md).

World Bank country income classification: https://api.worldbank.org/v2/country?format=json&per_page=400,
снимок в `income-groups.json` (SHA-256 включён). World Bank Open Data / CC BY 4.0:
https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets . Используется только
классификация доходов. Суммы расходов, заработка и коэффициенты в приложении —
игровая модель, не исходные экономические измерения. Подробности: `docs/CAUSAL_CORE.md`.

## Language/currency profiles and school structure

`life-profiles.json` contains a snapshot derived from Babel/Unicode CLDR (territory
languages, official-language hints, current tender currency) and World Bank UIS
indicators `SE.PRM.AGES`, `SE.PRM.DURS`, `SE.SEC.DURS` (latest available non-null
2010–2025 values). Metadata includes URLs and SHA-256 hashes for each raw response.
CLDR: https://github.com/unicode-org/cldr (Unicode License V3). Babel is BSD-3-Clause.
World Bank dataset terms/CC BY 4.0: https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets .
Rebuild: `scripts/life-data/build_profiles.py`; Babel version is recorded in the snapshot.

A language-group or reserve name is **not** a verified local or ethnic name. Existing
country/region corpora retain their original attribution. New fallbacks store their
selection level and underlying corpus; the UI discloses unverified local origin.

School year boundaries, subjects, grades, game-generated institutions/employers,
prices, wages, career conditions and currency display scales are authored game
parameters. Country indicators are structural snapshots, not a historical law or
school calendar. The currency display scale is **not an exchange rate**.

## Original pixel assets

`art/observer.json` and its PNG exports are original NO RULES artwork authored in
this repository. They were rendered locally with Pixelbolt 0.10.0, an MIT toolkit:
https://github.com/skulitom/Pixelbolt . Its MIT license is retained in
`art/PIXELBOLT_LICENSE.txt`. No showcase sprites or third-party game compositions
were copied. No external generative or paid API was used.

Лицензии новых языковых данных: `licenses/Babel.txt`, `licenses/Unicode.txt`.
