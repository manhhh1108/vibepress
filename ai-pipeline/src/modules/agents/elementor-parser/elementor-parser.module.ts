import { Module } from '@nestjs/common';
import { ElementorParserService } from './elementor-parser.service.js';
import { SqlModule } from '../../sql/sql.module.js';

@Module({
  imports: [SqlModule],
  providers: [ElementorParserService],
  exports: [ElementorParserService],
})
export class ElementorParserModule {}
