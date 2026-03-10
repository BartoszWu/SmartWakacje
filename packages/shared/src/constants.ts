export const AIRPORT_IDS: Record<string, number> = {
	Katowice: 2622,
	Warszawa: 2619,
	Kraków: 2620,
	Wrocław: 2621,
	Poznań: 2623,
	Gdańsk: 2624,
	Łódź: 2625,
	Rzeszów: 2626,
	Szczecin: 2627,
	Bydgoszcz: 2628,
};

export const COUNTRY_IDS: Record<string, number> = {
	Tunezja: 65,
	Turcja: 16,
	Egipt: 37,
	Grecja: 29,
	Hiszpania: 33,
	Chorwacja: 32,
	Bułgaria: 305,
	Cypr: 110,
	Maroko: 44,
	Portugalia: 74,
	Włochy: 31,
	Czarnogóra: 283,
	Albania: 436,
	Malta: 99,
};

export const SERVICE_TYPES: Record<string, number> = {
	"All Inclusive": 1,
	"Ultra All Inclusive": 2,
	"Śniadania i obiadokolacje": 3,
	Śniadania: 4,
	"Bez wyżywienia": 5,
};

export const ATTRIBUTE_IDS: Record<string, number> = {
	"Blisko plaży": 26,
	"Dla dzieci": 29,
	Aquapark: 21,
	"Basen odkryty": 25,
	"Basen kryty": 24,
	"Spa & Wellness": 46,
	"Bez paszportu": 36,
	Nurkowanie: 13,
	Internet: 6,
	Golf: 16,
};

export const DEFAULT_SCRAPER_CONFIG = {
	departureDateFrom: "2026-06-19",
	departureDateTo: "2026-06-30",
	airports: [2622],
	countries: [65, 16],
	service: 1,
	adults: 2,
	children: 2,
	childAges: ["20190603", "20210125"],
	attributes: [29],
	pageSize: 50,
	delayBetweenPages: 1000,
	minPrice: 8000,
	maxPrice: 14000,
} as const;
