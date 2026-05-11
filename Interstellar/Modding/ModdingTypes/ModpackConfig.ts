export default interface ModpackConfig {
    name: string,
    id: string,
    creator: string,
    description: string,
    zones?: Record<string, string>,
    audio?: Record<string, string>,
    menu?: string[],
    font?: string,
    non_interstellar?: boolean,
    icon?: string
    texture_pack?: boolean
    scripting?: string
    entrypoint?: string
}