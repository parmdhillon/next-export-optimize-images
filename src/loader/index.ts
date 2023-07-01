import path from 'path'

import fs from 'fs-extra'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import loadConfig from 'next/dist/server/config'
import type { StaticImageData } from 'next/image'
import type { LoaderContext } from 'webpack'

import type { Manifest } from '../cli'
import buildOutputInfo from '../utils/buildOutputInfo'

type LoaderOptions = {
  dir: string
  isServer: boolean
  isDev: boolean
}

export default async function loader(this: LoaderContext<LoaderOptions>, content: string) {
  this.cacheable && this.cacheable()
  const callback = this.async()

  const { dir, isServer, isDev } = this.getOptions()

  if (isServer || isDev) {
    callback(null, content)
    return
  }

  const { src } = JSON.parse(content.replace(/^export default /, '').replace(/;$/, '')) as StaticImageData

  const config = await loadConfig(PHASE_PRODUCTION_BUILD, dir)
  const allSizes = [...config.images.deviceSizes, ...config.images.imageSizes]

  await Promise.all(
    allSizes.map(async (size) => {
      const { output, extension } = buildOutputInfo({ src, width: size })
      const json: Manifest[number] = { output, src, width: size, extension }

      fs.appendFile(
        path.join(process.cwd(), '.next/next-export-optimize-images-list.nd.json'),
        JSON.stringify(json) + '\n'
      )
    })
  )

  callback(null, content)
  return
}