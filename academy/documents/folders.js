"use strict";
// User-approved document nomenclature; one canonical folder per template.
window.SCMDocumentFolderTree = [
  {
    "id": "01",
    "title": "01_Регламентирующие",
    "description": "Государственные требования, правовые основания и локальные нормативные акты.",
    "children": [
      {
        "id": "01/federal-laws",
        "title": "Федеральные законы",
        "forms": [],
        "requirements": [],
        "links": [
          {
            "title": "Федеральные законы: 273-ФЗ, 152-ФЗ, 63-ФЗ",
            "href": "regulations/?level=Федеральный+закон"
          }
        ]
      },
      {
        "id": "01/government",
        "title": "Постановления Правительства РФ",
        "forms": [],
        "requirements": [],
        "links": [
          {
            "title": "Постановления Правительства: лицензирование, платные услуги, ФРДО",
            "href": "regulations/?level=Постановление+Правительства"
          }
        ]
      },
      {
        "id": "01/ministry",
        "title": "Приказы Минпросвещения / Минобрнауки",
        "forms": [],
        "requirements": [],
        "links": [
          {
            "title": "Приказы: действующие и утратившие силу",
            "href": "regulations/?level=Приказ"
          }
        ]
      },
      {
        "id": "01/licenses",
        "title": "Лицензии и аккредитации",
        "forms": [],
        "requirements": [
          "Выписка из реестра лицензий на образовательную деятельность",
          "Сведения о государственной аккредитации по применимым программам"
        ],
        "links": []
      },
      {
        "id": "01/local-acts",
        "title": "Локальные нормативные акты",
        "forms": [
          "policies",
          "acknowledgement"
        ],
        "requirements": [
          "Устав образовательной организации",
          "Положения об организации образовательной деятельности"
        ],
        "links": []
      },
      {
        "id": "01/standards",
        "title": "СанПиН, ГОСТ, профстандарты, ОКПДТР–2026",
        "forms": [],
        "requirements": [],
        "links": [
          {
            "title": "ОКПДТР–2026 · полный ОК 016-2025",
            "href": "classifiers/"
          },
          {
            "title": "ГОСТ Р 7.0.97-2025",
            "href": "regulations/?q=ГОСТ"
          },
          {
            "title": "Санитарные требования",
            "href": "regulations/?q=санитар"
          },
          {
            "title": "Профессиональные стандарты по программам",
            "href": "regulations/?q=Профессиональные+стандарты"
          },
          {
            "title": "ФГОС по уровням и направлениям",
            "href": "regulations/?q=ФГОС"
          }
        ]
      }
    ]
  },
  {
    "id": "02",
    "title": "02_Приёмные",
    "description": "Приёмная комиссия, поступление и оформление образовательных отношений.",
    "children": [
      {
        "id": "02/rules",
        "title": "Правила приёма",
        "forms": [],
        "requirements": [
          "Правила приёма на обучение по видам программ"
        ],
        "links": []
      },
      {
        "id": "02/commission",
        "title": "Положение о приёмной комиссии",
        "forms": [],
        "requirements": [
          "Положение о приёмной комиссии",
          "Приказ о составе приёмной комиссии"
        ],
        "links": []
      },
      {
        "id": "02/directions",
        "title": "Направления и специальности",
        "forms": [],
        "requirements": [],
        "links": [
          {
            "title": "Каталог направлений и условия поступления",
            "href": "#/catalog"
          }
        ]
      },
      {
        "id": "02/minutes",
        "title": "Протоколы приёмной комиссии",
        "forms": [],
        "requirements": [
          "Протокол заседания приёмной комиссии"
        ],
        "links": []
      },
      {
        "id": "02/applications",
        "title": "Заявления абитуриентов",
        "forms": [
          "application",
          "consent"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "02/enrollment",
        "title": "Приказы о зачислении",
        "forms": [
          "enrollment"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "02/contracts",
        "title": "Договоры платных образовательных услуг",
        "forms": [
          "contract",
          "signature-agreement",
          "refund"
        ],
        "requirements": [],
        "links": []
      }
    ]
  },
  {
    "id": "03",
    "title": "03_Выпускные",
    "description": "Итоговая аттестация, документы о результатах обучения, приложения и учёт выдачи.",
    "children": [
      {
        "id": "03/gia",
        "title": "Положение о ГИА",
        "forms": [],
        "requirements": [
          "Положение о государственной итоговой аттестации (по применимости)",
          "Положение об итоговой аттестации ДПО / профессионального обучения"
        ],
        "links": []
      },
      {
        "id": "03/commissions",
        "title": "Протоколы ГЭК и аттестационных комиссий",
        "forms": [
          "assessment",
          "appeal",
          "appeal-decision"
        ],
        "requirements": [
          "Протокол заседания государственной экзаменационной комиссии"
        ],
        "links": []
      },
      {
        "id": "03/admission-orders",
        "title": "Приказы о допуске к защите",
        "forms": [],
        "requirements": [
          "Приказ о допуске к государственной итоговой аттестации / защите"
        ],
        "links": []
      },
      {
        "id": "03/issued-register",
        "title": "Реестр выданных дипломов",
        "forms": [
          "register"
        ],
        "requirements": [],
        "links": [
          {
            "title": "Публичная проверка выданного документа",
            "href": "../registry/registry.html"
          }
        ]
      },
      {
        "id": "03/diplomas",
        "title": "Дипломы",
        "forms": [
          "retraining",
          "education-diploma",
          "diploma-bachelor",
          "diploma-specialist",
          "diploma-master",
          "diploma-spo"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "03/certificates",
        "title": "Свидетельства, сертификаты и удостоверения",
        "forms": [
          "qualification-upgrade",
          "qualification-certificate",
          "training-certificate",
          "course-certificate",
          "participation",
          "completion",
          "badge"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "03/appendices",
        "title": "Приложения к дипломам, свидетельствам и удостоверениям",
        "forms": [
          "appendix-bachelor-specialist",
          "appendix-master",
          "appendix-spo",
          "appendix-retraining",
          "appendix-upgrade",
          "appendix-qualification"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "03/copies",
        "title": "Архивные копии дипломов и приложений",
        "forms": [
          "copy"
        ],
        "requirements": [
          "Архивные копии фактически выданных дипломов и приложений"
        ],
        "links": []
      },
      {
        "id": "03/duplicates",
        "title": "Дубликаты и справки о выдаче",
        "forms": [
          "duplicate",
          "correction"
        ],
        "requirements": [
          "Справка о выдаче документа об образовании / квалификации"
        ],
        "links": []
      }
    ]
  },
  {
    "id": "04",
    "title": "04_Учебные",
    "description": "Планы, программы, расписание, результаты обучения и приказы учебного процесса.",
    "children": [
      {
        "id": "04/programs",
        "title": "Учебные планы и программы",
        "forms": [
          "curriculum",
          "educational-program",
          "individual-plan"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "04/schedule",
        "title": "Расписания занятий и сессий",
        "forms": [
          "schedule"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "04/assessment",
        "title": "Ведомости, зачётные книжки и студенческие документы",
        "forms": [
          "statement",
          "individual-statement",
          "gradebook",
          "student-ticket-vo",
          "student-card"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "04/orders",
        "title": "Приказы по учебному процессу",
        "forms": [
          "transfer",
          "termination",
          "reinstatement",
          "leave-order",
          "extract",
          "academic-leave"
        ],
        "requirements": [],
        "links": []
      },
      {
        "id": "04/methods",
        "title": "Методические материалы",
        "forms": [
          "practice",
          "practice-report",
          "portfolio"
        ],
        "requirements": [],
        "links": [
          {
            "title": "Библиотека учебных материалов",
            "href": "guides/"
          }
        ]
      },
      {
        "id": "04/certificates",
        "title": "Справки об обучении и статусе",
        "forms": [
          "study-certificate",
          "status-certificate"
        ],
        "requirements": [],
        "links": []
      }
    ]
  },
  {
    "id": "05",
    "title": "05_Кадровые",
    "description": "Документы сотрудников и преподавателей; кадровые классификаторы.",
    "children": [
      {
        "id": "05/personal-files",
        "title": "Личные дела сотрудников",
        "forms": [],
        "requirements": [
          "Опись личного дела сотрудника",
          "Документы об образовании и квалификации сотрудника"
        ],
        "links": []
      },
      {
        "id": "05/employment",
        "title": "Трудовые договоры",
        "forms": [],
        "requirements": [
          "Трудовой договор с сотрудником / преподавателем",
          "Дополнительные соглашения к трудовому договору"
        ],
        "links": []
      },
      {
        "id": "05/orders",
        "title": "Приказы по личному составу",
        "forms": [],
        "requirements": [
          "Приказы о приёме, переводе, отпуске и увольнении сотрудников"
        ],
        "links": []
      },
      {
        "id": "05/development",
        "title": "Аттестация и повышение квалификации ППС",
        "forms": [],
        "requirements": [
          "Положение об аттестации педагогических работников",
          "Протоколы аттестационной комиссии",
          "План повышения квалификации преподавателей"
        ],
        "links": []
      },
      {
        "id": "05/references",
        "title": "Справочники для кадров",
        "forms": [],
        "requirements": [],
        "links": [
          {
            "title": "ОКПДТР–2026 · ссылка на единый справочник (01_Регламентирующие)",
            "href": "classifiers/"
          },
          {
            "title": "Профстандарты и квалификационные требования",
            "href": "regulations/?topic=Кадры+и+квалификации"
          }
        ]
      }
    ]
  },
  {
    "id": "06",
    "title": "06_Внутренние",
    "description": "Организационные решения, структурные подразделения, инструкции и регламенты.",
    "children": [
      {
        "id": "06/council",
        "title": "Протоколы педагогических советов",
        "forms": [],
        "requirements": [
          "Протокол заседания педагогического совета"
        ],
        "links": []
      },
      {
        "id": "06/orders",
        "title": "Приказы по основной деятельности",
        "forms": [],
        "requirements": [
          "Приказы по основной деятельности организации"
        ],
        "links": []
      },
      {
        "id": "06/departments",
        "title": "Положения о структурных подразделениях",
        "forms": [],
        "requirements": [
          "Положение о структурном подразделении"
        ],
        "links": []
      },
      {
        "id": "06/instructions",
        "title": "Инструкции и регламенты",
        "forms": [],
        "requirements": [
          "Инструкция по делопроизводству",
          "Регламент электронного документооборота",
          "Инструкция по учёту и хранению бланков"
        ],
        "links": []
      }
    ]
  },
  {
    "id": "07",
    "title": "07_Архив",
    "description": "Архив прошлых лет и документы передачи; проекты не становятся архивом автоматически.",
    "children": [
      {
        "id": "07/years",
        "title": "Архив по годам",
        "forms": [],
        "requirements": [
          "Опись архивных дел по годам"
        ],
        "links": []
      },
      {
        "id": "07/acts",
        "title": "Акты передачи и списания",
        "forms": [],
        "requirements": [
          "Акт приёма-передачи документов в архив",
          "Акт о выделении к уничтожению документов, не подлежащих хранению"
        ],
        "links": []
      }
    ]
  }
];
