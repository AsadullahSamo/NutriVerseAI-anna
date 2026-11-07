// Every other file in this folder registers its routes when imported.
import.meta.glob(["./*.js", "!./index.js"], { eager: true })
